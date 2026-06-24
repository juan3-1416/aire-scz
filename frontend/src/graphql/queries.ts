import { gql } from "@apollo/client";

export const GET_INITIAL_DATA = gql`
  query GetInitialData {
    healthCheck

    stations {
      id
      name
      zone
      latitude
      longitude
      isActive
    }

    latestMeasurements {
      station {
        id
        name
        zone
      }
      recordedAt
      pm25
      co
      o3
    }

    currentAlerts {
      id
      stationName
      pollutant
      level
      value
      unit
      message
      recordedAt
    }
  }
`;