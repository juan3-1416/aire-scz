from datetime import datetime

import strawberry

from air_quality.models import Alert, Measurement, Station


@strawberry.type
class StationType:
    id: int
    name: str
    zone: str
    latitude: float
    longitude: float
    is_active: bool
    created_at: datetime

    @classmethod
    def from_model(cls, station: Station) -> "StationType":
        return cls(
            id=station.id,
            name=station.name,
            zone=station.zone,
            latitude=station.location.y,
            longitude=station.location.x,
            is_active=station.is_active,
            created_at=station.created_at,
        )


@strawberry.type
class MeasurementType:
    id: int
    station: StationType
    recorded_at: datetime
    pm25: float | None
    co: float | None
    o3: float | None
    source: str
    source_label: str
    aqi_us: int | None
    main_pollutant: str

    @classmethod
    def from_model(cls, measurement: Measurement) -> "MeasurementType":
        return cls(
            id=measurement.id,
            station=StationType.from_model(measurement.station),
            recorded_at=measurement.recorded_at,
            pm25=measurement.pm25,
            co=measurement.co,
            o3=measurement.o3,
            source=measurement.source,
            source_label=Measurement.Source(measurement.source).label,
            aqi_us=measurement.aqi_us,
            main_pollutant=measurement.main_pollutant,
        )


@strawberry.type
class AlertType:
    id: int
    station_id: int
    station_name: str
    pollutant: str
    level: str
    value: float | None
    unit: str
    message: str
    recorded_at: datetime
    created_at: datetime

    @classmethod
    def from_model(cls, alert: Alert) -> "AlertType":
        measurement = alert.measurement

        pollutant_values = {
            "PM25": {
                "value": measurement.pm25,
                "unit": "µg/m³",
            },
            "CO": {
                "value": measurement.co,
                "unit": "ppm",
            },
            "O3": {
                "value": measurement.o3,
                "unit": "ppb",
            },
        }

        pollutant_data = pollutant_values[alert.pollutant]

        return cls(
            id=alert.id,
            station_id=measurement.station.id,
            station_name=measurement.station.name,
            pollutant=alert.pollutant,
            level=alert.level,
            value=pollutant_data["value"],
            unit=pollutant_data["unit"],
            message=alert.message,
            recorded_at=measurement.recorded_at,
            created_at=alert.created_at,
        )