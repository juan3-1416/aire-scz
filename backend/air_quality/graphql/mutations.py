import strawberry

from air_quality.graphql.types import MeasurementType
from air_quality.services.iqair import sync_iqair_measurement


@strawberry.type
class Mutation:
    @strawberry.mutation
    def sync_iqair(
        self,
        latitude: float = -17.7833,
        longitude: float = -63.1821,
    ) -> MeasurementType:
        measurement = sync_iqair_measurement(
            latitude=latitude,
            longitude=longitude,
        )

        return MeasurementType.from_model(measurement)