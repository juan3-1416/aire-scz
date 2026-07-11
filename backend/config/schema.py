import strawberry

from air_quality.graphql.queries import Query
from air_quality.graphql.mutations import Mutation


schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
)