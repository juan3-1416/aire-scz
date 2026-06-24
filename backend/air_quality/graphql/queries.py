from datetime import datetime

import strawberry

from air_quality.models import Alert, Measurement, Station
from .types import AlertType, MeasurementType, StationType


@strawberry.type
class Query:
    @strawberry.field
    def health_check(self) -> str:
        return "Backend AireSCZ funcionando correctamente"

    @strawberry.field
    def stations(self, active_only: bool = True) -> list[StationType]:
        queryset = Station.objects.all().order_by("name")

        if active_only:
            queryset = queryset.filter(is_active=True)

        return [
            StationType.from_model(station)
            for station in queryset
        ]

    @strawberry.field
    def latest_measurements(
        self,
        active_only: bool = True,
    ) -> list[MeasurementType]:
        queryset = Measurement.objects.select_related("station")

        if active_only:
            queryset = queryset.filter(station__is_active=True)

        queryset = queryset.order_by(
            "station_id",
            "-recorded_at",
        ).distinct("station_id")

        measurements = list(queryset)
        measurements.sort(key=lambda measurement: measurement.station.name)

        return [
            MeasurementType.from_model(measurement)
            for measurement in measurements
        ]

    @strawberry.field
    def measurements(
        self,
        station_id: int,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 2000,
    ) -> list[MeasurementType]:
        safe_limit = max(1, min(limit, 5000))

        queryset = Measurement.objects.select_related("station").filter(
            station_id=station_id
        )

        if start_date:
            queryset = queryset.filter(recorded_at__gte=start_date)

        if end_date:
            queryset = queryset.filter(recorded_at__lte=end_date)

        queryset = queryset.order_by("recorded_at")[:safe_limit]

        return [
            MeasurementType.from_model(measurement)
            for measurement in queryset
        ]

    @strawberry.field
    def current_alerts(
        self,
        limit: int = 100,
    ) -> list[AlertType]:
        safe_limit = max(1, min(limit, 500))

        latest_measurements = list(
            Measurement.objects.select_related("station")
            .filter(station__is_active=True)
            .order_by("station_id", "-recorded_at")
            .distinct("station_id")
        )

        latest_measurement_ids = [
            measurement.id
            for measurement in latest_measurements
        ]

        queryset = (
            Alert.objects.select_related("measurement__station")
            .filter(
                measurement_id__in=latest_measurement_ids,
                is_active=True,
            )
            .order_by("-created_at")[:safe_limit]
        )

        return [
            AlertType.from_model(alert)
            for alert in queryset
        ]

    @strawberry.field
    def alert_history(
        self,
        station_id: int | None = None,
        limit: int = 200,
    ) -> list[AlertType]:
        safe_limit = max(1, min(limit, 1000))

        queryset = Alert.objects.select_related(
            "measurement__station"
        ).order_by("-created_at")

        if station_id:
            queryset = queryset.filter(
                measurement__station_id=station_id
            )

        queryset = queryset[:safe_limit]

        return [
            AlertType.from_model(alert)
            for alert in queryset
        ]