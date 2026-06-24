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
): number {
  const field = POLLUTANT_META[pollutant].field;

  return measurement[field];
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

function getHaloRadius(
  pollutant: Pollutant,
  value: number,
): number {
  const maxValue = POLLUTANT_META[pollutant].maxVisualValue;
  const normalizedValue = Math.min(value / maxValue, 1);

  return 1000 + normalizedValue * 4500;
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

  const meta = POLLUTANT_META[pollutant];

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
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {stations.map((station) => {
          const measurement = measurementByStation.get(station.id);

          if (!measurement) {
            return null;
          }

          const value = getPollutantValue(measurement, pollutant);
          const status = getStatus(pollutant, value);
          const haloRadius = getHaloRadius(pollutant, value);

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
                      color: status.color,
                      fillColor: status.color,
                      fillOpacity: 0.035,
                      weight: 0,
                    }}
                  />

                  <Circle
                    center={position}
                    radius={haloRadius}
                    pathOptions={{
                      color: status.color,
                      fillColor: status.color,
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
                    fillColor: status.color,
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="station-popup">
                      <h3>{station.name}</h3>
                      <p>{station.zone}</p>

                      <strong style={{ color: status.color }}>
                        {status.label}: {value.toFixed(2)} {meta.unit}
                      </strong>

                      <hr />

                      <p>PM2.5: {measurement.pm25.toFixed(2)} µg/m³</p>
                      <p>CO: {measurement.co.toFixed(2)} ppm</p>
                      <p>O₃: {measurement.o3.toFixed(2)} ppb</p>
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