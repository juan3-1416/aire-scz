import strawberry

from air_quality.graphql.queries import Query


schema = strawberry.Schema(query=Query)