from django.core.management.base import BaseCommand

from air_quality.services.iqair import sync_iqair_measurement


class Command(BaseCommand):
    help = "Sincroniza una medición real desde IQAir para Santa Cruz."

    def add_arguments(self, parser):
        parser.add_argument(
            "--lat",
            type=float,
            default=-17.7833,
            help="Latitud de consulta. Por defecto: Santa Cruz de la Sierra.",
        )
        parser.add_argument(
            "--lon",
            type=float,
            default=-63.1821,
            help="Longitud de consulta. Por defecto: Santa Cruz de la Sierra.",
        )

    def handle(self, *args, **options):
        measurement = sync_iqair_measurement(
            latitude=options["lat"],
            longitude=options["lon"],
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Medición IQAir sincronizada: "
                f"{measurement.station.name} | "
                f"PM2.5={measurement.pm25} | "
                f"CO={measurement.co} | "
                f"O3={measurement.o3} | "
                f"AQI US={measurement.aqi_us}"
            )
        )