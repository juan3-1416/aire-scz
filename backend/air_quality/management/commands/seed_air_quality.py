import random
from datetime import timedelta
from math import pi, sin

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from air_quality.models import Alert, Measurement, Station
from air_quality.services.alerts import build_alerts_for_measurement


# Coordenadas aproximadas para fines académicos.
# No representan estaciones oficiales de monitoreo.
STATIONS = [
    {
        "name": "Centro",
        "zone": "Centro",
        "longitude": -63.1821,
        "latitude": -17.7833,
        "pm25_bias": 9.0,
        "co_bias": 0.35,
        "o3_bias": -2.0,
    },
    {
        "name": "Equipetrol",
        "zone": "Equipetrol",
        "longitude": -63.1960,
        "latitude": -17.7700,
        "pm25_bias": 3.0,
        "co_bias": 0.12,
        "o3_bias": 4.0,
    },
    {
        "name": "Mutualista",
        "zone": "Mutualista",
        "longitude": -63.1650,
        "latitude": -17.7540,
        "pm25_bias": 5.0,
        "co_bias": 0.20,
        "o3_bias": 1.0,
    },
    {
        "name": "Villa Primero de Mayo",
        "zone": "Villa Primero de Mayo",
        "longitude": -63.1450,
        "latitude": -17.8100,
        "pm25_bias": 11.0,
        "co_bias": 0.30,
        "o3_bias": -1.0,
    },
    {
        "name": "Plan 3000",
        "zone": "Plan 3000",
        "longitude": -63.1560,
        "latitude": -17.8400,
        "pm25_bias": 15.0,
        "co_bias": 0.38,
        "o3_bias": -3.0,
    },
    {
        "name": "El Trompillo",
        "zone": "El Trompillo",
        "longitude": -63.1760,
        "latitude": -17.8110,
        "pm25_bias": 8.0,
        "co_bias": 0.28,
        "o3_bias": 1.0,
    },
    {
        "name": "La Ramada",
        "zone": "La Ramada",
        "longitude": -63.1930,
        "latitude": -17.8010,
        "pm25_bias": 10.0,
        "co_bias": 0.32,
        "o3_bias": 0.0,
    },
    {
        "name": "Cotoca",
        "zone": "Cotoca",
        "longitude": -63.0480,
        "latitude": -17.7430,
        "pm25_bias": 1.0,
        "co_bias": 0.08,
        "o3_bias": 2.0,
    },
]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


class Command(BaseCommand):
    help = (
        "Carga estaciones simuladas de Santa Cruz y genera "
        "mediciones históricas de PM2.5, CO y O₃."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=60,
            help="Cantidad de días históricos a generar. Por defecto: 60.",
        )
        parser.add_argument(
            "--interval-hours",
            type=int,
            default=1,
            help="Intervalo entre mediciones en horas. Por defecto: 1.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260623,
            help="Semilla para reproducir los mismos datos.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina estaciones, mediciones y alertas antes de generar datos nuevos.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        days = options["days"]
        interval_hours = options["interval_hours"]
        seed = options["seed"]
        reset = options["reset"]

        if days <= 0:
            raise CommandError("--days debe ser mayor que cero.")

        if interval_hours <= 0:
            raise CommandError("--interval-hours debe ser mayor que cero.")

        if Measurement.objects.exists() and not reset:
            raise CommandError(
                "Ya existen mediciones. Ejecuta el comando con --reset "
                "para regenerar los datos simulados."
            )

        if reset:
            self.stdout.write("Eliminando datos anteriores...")
            Alert.objects.all().delete()
            Measurement.objects.all().delete()
            Station.objects.all().delete()

        random_generator = random.Random(seed)

        self.stdout.write("Creando estaciones simuladas...")

        stations_by_name = {}

        for station_data in STATIONS:
            station, _ = Station.objects.update_or_create(
                name=station_data["name"],
                defaults={
                    "zone": station_data["zone"],
                    "location": Point(
                        station_data["longitude"],
                        station_data["latitude"],
                        srid=4326,
                    ),
                    "is_active": True,
                },
            )
            stations_by_name[station.name] = station

        end_time = timezone.localtime(timezone.now()).replace(
            minute=0,
            second=0,
            microsecond=0,
        )

        total_steps = (days * 24) // interval_hours
        start_time = end_time - timedelta(
            hours=(total_steps - 1) * interval_hours
        )

        timestamps = [
            start_time + timedelta(hours=step * interval_hours)
            for step in range(total_steps)
        ]

        daily_effects = {}

        for date_value in sorted({timestamp.date() for timestamp in timestamps}):
            smoke_effect = (
                random_generator.uniform(12, 38)
                if random_generator.random() < 0.18
                else 0
            )

            ozone_effect = (
                random_generator.uniform(8, 24)
                if random_generator.random() < 0.16
                else 0
            )

            daily_effects[date_value] = {
                "smoke": smoke_effect,
                "ozone": ozone_effect,
            }

        self.stdout.write("Generando mediciones históricas...")

        measurements = []

        for station_data in STATIONS:
            station = stations_by_name[station_data["name"]]

            for recorded_at in timestamps:
                hour = recorded_at.hour
                weekday = recorded_at.weekday()

                daylight_factor = max(
                    0,
                    sin(pi * (hour - 6) / 12),
                )

                is_morning_peak = 6 <= hour <= 9
                is_evening_peak = 17 <= hour <= 21
                is_traffic_peak = is_morning_peak or is_evening_peak

                traffic_pm25 = 13 if is_morning_peak else 10 if is_evening_peak else 0
                traffic_co = 0.75 if is_traffic_peak else 0
                weekend_adjustment = -3.5 if weekday >= 5 else 0

                effects = daily_effects[recorded_at.date()]
                smoke_effect = effects["smoke"]
                ozone_effect = effects["ozone"]

                congestion_event = 0

                if (
                    is_traffic_peak
                    and station_data["name"] in {"Centro", "Plan 3000", "La Ramada"}
                    and random_generator.random() < 0.035
                ):
                    congestion_event = random_generator.uniform(2.5, 4.5)

                pm25 = (
                    14
                    + station_data["pm25_bias"]
                    + traffic_pm25
                    + weekend_adjustment
                    + smoke_effect
                    + random_generator.gauss(0, 4.5)
                )

                co = (
                    0.45
                    + station_data["co_bias"]
                    + traffic_co
                    + (smoke_effect * 0.025)
                    + congestion_event
                    + random_generator.gauss(0, 0.16)
                )

                o3 = (
                    20
                    + station_data["o3_bias"]
                    + (daylight_factor * 46)
                    + ozone_effect
                    + (smoke_effect * 0.12)
                    + random_generator.gauss(0, 4)
                )

                measurements.append(
                    Measurement(
                        station=station,
                        recorded_at=recorded_at,
                        pm25=round(clamp(pm25, 3, 220), 2),
                        co=round(clamp(co, 0.05, 20), 2),
                        o3=round(clamp(o3, 5, 200), 2),
                    )
                )

        Measurement.objects.bulk_create(measurements, batch_size=1000)

        self.stdout.write("Generando alertas...")

        created_measurements = Measurement.objects.select_related("station").all()
        alerts = []

        for measurement in created_measurements:
            alerts.extend(build_alerts_for_measurement(measurement))

        Alert.objects.bulk_create(alerts, batch_size=1000)

        self.stdout.write(
            self.style.SUCCESS(
                f"Proceso finalizado: "
                f"{Station.objects.count()} estaciones, "
                f"{Measurement.objects.count()} mediciones y "
                f"{Alert.objects.count()} alertas creadas."
            )
        )