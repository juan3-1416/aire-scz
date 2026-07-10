import { Fragment } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

import type {
  LatestMeasurement,
  Pollutant,
  Station,
} from "../types/airQuality";

import "./AirQualityMap.css";

type AirQualityMapProps = {
  stations: Station[];
  measurements: LatestMeasurement[];
  pollutant: Pollutant;
  showStations: boolean;
  showHalo: boolean;
};

type Status = {
  label: string;
  color: string;
};

type DisplayMetric = {
  value: number;
  label: string;
  unit: string;
  status: Status;
  isAqiFallback: boolean;
};

const SANTA_CRUZ_CENTER: [number, number] = [-17.7833, -63.1821];

const POLLUTANT_META = {
  PM25: {
    label: "PM2.5",
    unit: "µg/m³",
    field: "pm25",
    maxVisualValue: 150,
  },
  CO: {
    label: "CO",
    unit: "ppm",
    field: "co",
    maxVisualValue: 15,
  },
  O3: {
    label: "O₃",
    unit: "ppb",
    field: "o3",
    maxVisualValue: 120,
  },
} as const;

function getPollutantValue(
  measurement: LatestMeasurement,
  pollutant: Pollutant,
): number | null {
  const field = POLLUTANT_META[pollutant].field;
  return measurement[field];
}

function formatNullableValue(
  value: number | null | undefined,
  unit: string,
) {
  if (value === null || value === undefined) {
    return "N/D";
  }

  return `${value.toFixed(2)} ${unit}`;
}

function getStatus(pollutant: Pollutant, value: number): Status {
  if (pollutant === "PM25") {
    if (value >= 150) return { label: "Crítica", color: "#ef4444" };
    if (value >= 55) return { label: "Alta", color: "#f97316" };
    if (value >= 25) return { label: "Moderada", color: "#facc15" };
    return { label: "Normal", color: "#22c55e" };
  }

  if (pollutant === "CO") {
    if (value >= 15) return { label: "Crítica", color: "#ef4444" };
    if (value >= 9) return { label: "Alta", color: "#f97316" };
    if (value >= 4) return { label: "Moderada", color: "#facc15" };
    return { label: "Normal", color: "#22c55e" };
  }

  if (value >= 120) return { label: "Crítica", color: "#ef4444" };
  if (value >= 90) return { label: "Alta", color: "#f97316" };
  if (value >= 60) return { label: "Moderada", color: "#facc15" };
  return { label: "Normal", color: "#22c55e" };
}

function getAqiStatus(aqi: number): Status {
  if (aqi >= 151) return { label: "No saludable", color: "#ef4444" };
  if (aqi >= 101) return { label: "Alta", color: "#f97316" };
  if (aqi >= 51) return { label: "Moderada", color: "#facc15" };
  return { label: "Buena", color: "#22c55e" };
}

function getHaloRadius(
  pollutant: Pollutant,
  value: number,
): number {
  const maxValue = POLLUTANT_META[pollutant].maxVisualValue;
  const normalizedValue = Math.min(value / maxValue, 1);

  return 1000 + normalizedValue * 4500;
}

function getAqiHaloRadius(aqi: number): number {
  const normalizedValue = Math.min(aqi / 200, 1);
  return 1000 + normalizedValue * 4500;
}

function getDisplayMetric(
  measurement: LatestMeasurement,
  pollutant: Pollutant,
): DisplayMetric | null {
  const meta = POLLUTANT_META[pollutant];
  const pollutantValue = getPollutantValue(measurement, pollutant);

  if (pollutantValue !== null && pollutantValue !== undefined) {
    return {
      value: pollutantValue,
      label: meta.label,
      unit: meta.unit,
      status: getStatus(pollutant, pollutantValue),
      isAqiFallback: false,
    };
  }

  if (measurement.aqiUs !== null && measurement.aqiUs !== undefined) {
    return {
      value: measurement.aqiUs,
      label: "AQI US",
      unit: "índice",
      status: getAqiStatus(measurement.aqiUs),
      isAqiFallback: true,
    };
  }

  return null;
}

function getSourceLabel(measurement: LatestMeasurement) {
  if (measurement.source === "IQAIR") {
    return "Dato real IQAir";
  }

  return "Dato simulado";
}

export default function AirQualityMap({
  stations,
  measurements,
  pollutant,
  showStations,
  showHalo,
}: AirQualityMapProps) {
  const measurementByStation = new Map(
    measurements.map((measurement) => [
      measurement.station.id,
      measurement,
    ]),
  );

  return (
    <div className="air-quality-map">
      <MapContainer
        center={SANTA_CRUZ_CENTER}
        zoom={11}
        minZoom={10}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {stations.map((station) => {
          const measurement = measurementByStation.get(station.id);

          if (!measurement) {
            return null;
          }

          const displayMetric = getDisplayMetric(measurement, pollutant);

          if (!displayMetric) {
            return null;
          }

          const haloRadius = displayMetric.isAqiFallback
            ? getAqiHaloRadius(displayMetric.value)
            : getHaloRadius(pollutant, displayMetric.value);

          const position: [number, number] = [
            station.latitude,
            station.longitude,
          ];

          return (
            <Fragment key={station.id}>
              {showHalo && (
                <>
                  <Circle
                    center={position}
                    radius={haloRadius * 1.8}
                    pathOptions={{
                      color: displayMetric.status.color,
                      fillColor: displayMetric.status.color,
                      fillOpacity: 0.035,
                      weight: 0,
                    }}
                  />

                  <Circle
                    center={position}
                    radius={haloRadius}
                    pathOptions={{
                      color: displayMetric.status.color,
                      fillColor: displayMetric.status.color,
                      fillOpacity: 0.1,
                      weight: 0,
                    }}
                  />
                </>
              )}

              {showStations && (
                <CircleMarker
                  center={position}
                  radius={9}
                  pathOptions={{
                    color: "#ffffff",
                    fillColor: displayMetric.status.color,
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="station-popup">
                      <h3>{station.name}</h3>
                      <p>{station.zone}</p>

                      <strong style={{ color: displayMetric.status.color }}>
                        {displayMetric.status.label}:{" "}
                        {displayMetric.value.toFixed(2)}{" "}
                        {displayMetric.unit}
                      </strong>

                      {displayMetric.isAqiFallback && (
                        <p>
                          No hay concentración específica disponible para el
                          contaminante seleccionado. Se muestra AQI US.
                        </p>
                      )}

                      <hr />

                      <p>
                        PM2.5:{" "}
                        {formatNullableValue(measurement.pm25, "µg/m³")}
                      </p>
                      <p>
                        CO: {formatNullableValue(measurement.co, "ppm")}
                      </p>
                      <p>
                        O₃: {formatNullableValue(measurement.o3, "ppb")}
                      </p>

                      <hr />

                      <p>
                        <strong>Fuente:</strong> {getSourceLabel(measurement)}
                      </p>

                      {measurement.aqiUs !== null &&
                        measurement.aqiUs !== undefined && (
                          <p>
                            <strong>AQI US:</strong> {measurement.aqiUs}
                          </p>
                        )}

                      {measurement.mainPollutant && (
                        <p>
                          <strong>Contaminante principal:</strong>{" "}
                          {measurement.mainPollutant}
                        </p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )}
            </Fragment>
          );
        })}
      </MapContainer>

      <div className="map-title">
        <span>MAPA GEORREFERENCIADO</span>
        <strong>Santa Cruz de la Sierra</strong>
      </div>
    </div>
  );
}