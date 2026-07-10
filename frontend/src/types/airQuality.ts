export type Pollutant = "PM25" | "CO" | "O3";

export type Station = {
  id: number;
  name: string;
  zone: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
};

export type LatestMeasurement = {
  station: {
    id: number;
    name: string;
    zone: string;
  };
  recordedAt: string;
  pm25: number | null;
  co: number | null;
  o3: number | null;
  source: "SIMULATED" | "IQAIR";
  sourceLabel: string;
  aqiUs: number | null;
  mainPollutant: string;
};

export type CurrentAlert = {
  id: number;
  stationName: string;
  pollutant: string;
  level: string;
  value: number;
  unit: string;
  message: string;
  recordedAt: string;
};

export type InitialData = {
  healthCheck: string;
  stations: Station[];
  latestMeasurements: LatestMeasurement[];
  currentAlerts: CurrentAlert[];
};