from datetime import datetime
import os

import requests
from django.contrib.gis.geos import Point
from django.utils import timezone

from air_quality.models import Measurement, Station
from air_quality.services.alerts import build_alerts_for_measurement


IQAIR_URL = "https://api.airvisual.com/v2/nearest_city"


def parse_datetime(value: str | None):
    if not value:
        return timezone.now()

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return timezone.now()


def get_pollutant_value(pollution: dict, *keys: str):
    for key in keys:
        value = pollution.get(key)

        if value is not None:
            return float(value)

    return None


def fetch_iqair_nearest_city(latitude: float, longitude: float) -> dict:
    api_key = os.getenv("IQAIR_API_KEY")

    if not api_key or api_key == "change_me":
        raise ValueError("Falta configurar IQAIR_API_KEY en el archivo .env")

    response = requests.get(
        IQAIR_URL,
        params={
            "lat": latitude,
            "lon": longitude,
            "key": api_key,
        },
        timeout=20,
    )

    response.raise_for_status()
    payload = response.json()

    if payload.get("status") != "success":
        raise ValueError(f"IQAir respondió con error: {payload}")

    return payload

def normalize_main_pollutant(value: str | None) -> str:
    pollutant_names = {
        "p2": "PM2.5",
        "p1": "PM10",
        "o3": "O₃",
        "n2": "NO₂",
        "s2": "SO₂",
        "co": "CO",
    }

    if not value:
        return ""

    return pollutant_names.get(value.lower(), value.upper())

def sync_iqair_measurement(latitude: float, longitude: float) -> Measurement:
    payload = fetch_iqair_nearest_city(latitude, longitude)
    data = payload["data"]

    city = data.get("city", "Santa Cruz de la Sierra")
    state = data.get("state", "Santa Cruz")
    country = data.get("country", "Bolivia")

    coordinates = data.get("location", {}).get(
        "coordinates",
        [longitude, latitude],
    )

    source_longitude = coordinates[0]
    source_latitude = coordinates[1]

    station_name = f"IQAir - {city}"

    station, _ = Station.objects.update_or_create(
        name=station_name,
        defaults={
            "zone": f"{city}, {state}, {country}",
            "location": Point(
                source_longitude,
                source_latitude,
                srid=4326,
            ),
            "is_active": True,
        },
    )

    pollution = data.get("current", {}).get("pollution", {})

    recorded_at = parse_datetime(pollution.get("ts"))

    measurement, _ = Measurement.objects.update_or_create(
        station=station,
        recorded_at=recorded_at,
        source=Measurement.Source.IQAIR,
        defaults={
            "pm25": get_pollutant_value(
                pollution,
                "p2",
                "pm25",
                "pm2_5",
            ),
            "co": get_pollutant_value(
                pollution,
                "co",
            ),
            "o3": get_pollutant_value(
                pollution,
                "o3",
            ),
            "aqi_us": pollution.get("aqius"),
            "main_pollutant": normalize_main_pollutant(
    pollution.get("mainus")
),
            "source_city": city,
            "source_payload": payload,
        },
    )

    measurement.alerts.all().delete()

    alerts = build_alerts_for_measurement(measurement)

    for alert in alerts:
        alert.save()

    return measurement