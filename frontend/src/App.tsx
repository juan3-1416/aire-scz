import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";

import AirQualityMap from "./components/AirQualityMap";
import HistoricalChart from "./components/HistoricalChart";
import {
  GET_INITIAL_DATA,
  SYNC_IQAIR,
} from "./graphql/queries";
import type { InitialData, Pollutant } from "./types/airQuality";

import "./App.css";

type SourceFilter = "ALL" | "SIMULATED" | "IQAIR";

const pollutantLabels: Record<Pollutant, string> = {
  PM25: "PM2.5",
  CO: "CO",
  O3: "O₃",
};

const pollutantUnits: Record<Pollutant, string> = {
  PM25: "µg/m³",
  CO: "ppm",
  O3: "ppb",
};

const sourceFilterLabels: Record<SourceFilter, string> = {
  ALL: "Todos",
  SIMULATED: "Simulados",
  IQAIR: "API real",
};

function getMeasurementValue(
  pollutant: Pollutant,
  value: {
    pm25: number | null;
    co: number | null;
    o3: number | null;
  },
): number | null {
  if (pollutant === "PM25") return value.pm25;
  if (pollutant === "CO") return value.co;

  return value.o3;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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

function estimatePm25FromAqi(aqi: number): number | null {
  const breakpoints = [
    { aqiLow: 0, aqiHigh: 50, concLow: 0.0, concHigh: 9.0 },
    { aqiLow: 51, aqiHigh: 100, concLow: 9.1, concHigh: 35.4 },
    { aqiLow: 101, aqiHigh: 150, concLow: 35.5, concHigh: 55.4 },
    { aqiLow: 151, aqiHigh: 200, concLow: 55.5, concHigh: 125.4 },
    { aqiLow: 201, aqiHigh: 300, concLow: 125.5, concHigh: 225.4 },
  ];

  const range = breakpoints.find(
    (item) => aqi >= item.aqiLow && aqi <= item.aqiHigh,
  );

  if (!range) {
    return null;
  }

  const concentration =
    ((range.concHigh - range.concLow) /
      (range.aqiHigh - range.aqiLow)) *
      (aqi - range.aqiLow) +
    range.concLow;

  return concentration;
}

function formatPm25Value(measurement: {
  pm25: number | null;
  aqiUs: number | null;
  mainPollutant: string;
  source: string;
}) {
  if (measurement.pm25 !== null && measurement.pm25 !== undefined) {
    return `${measurement.pm25.toFixed(2)} µg/m³`;
  }

  const mainPollutant = measurement.mainPollutant?.toUpperCase() ?? "";

  const isIqairPm25 =
    measurement.source === "IQAIR" &&
    mainPollutant === "PM2.5" &&
    measurement.aqiUs !== null &&
    measurement.aqiUs !== undefined;

  if (isIqairPm25) {
    const estimatedPm25 = estimatePm25FromAqi(measurement.aqiUs);

    if (estimatedPm25 !== null) {
      return `${estimatedPm25.toFixed(2)} µg/m³ estimado`;
    }
  }

  return "N/D";
}

function App() {
  const [selectedPollutant, setSelectedPollutant] =
    useState<Pollutant>("PM25");

  const [showStations, setShowStations] = useState(true);
  const [showHalo, setShowHalo] = useState(true);
  const [sourceFilter, setSourceFilter] =
    useState<SourceFilter>("ALL");

  const [selectedHistoryStationId, setSelectedHistoryStationId] =
    useState<number | null>(null);

  const [historyDays, setHistoryDays] = useState(60);

  const { data, loading, error, refetch } = useQuery<InitialData>(
    GET_INITIAL_DATA,
  );

  const [
    syncIqair,
    {
      loading: syncingIqair,
      error: syncIqairError,
    },
  ] = useMutation(SYNC_IQAIR, {
    refetchQueries: [{ query: GET_INITIAL_DATA }],
    awaitRefetchQueries: true,
  });

  async function handleSyncIqair() {
    try {
      await syncIqair();
      setSourceFilter("IQAIR");
    } catch {
      // Apollo ya expone el error en syncIqairError.
    }
  }

  if (loading) {
    return (
      <main className="state-message">
        Cargando información geoespacial de AireSCZ...
      </main>
    );
  }

  if (error) {
    return (
      <main className="state-message error">
        <h1>No se pudo conectar con GraphQL</h1>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Reintentar</button>
      </main>
    );
  }

  const stations = data?.stations ?? [];
  const measurements = data?.latestMeasurements ?? [];
  const alerts = data?.currentAlerts ?? [];

  const displayedMeasurements =
    sourceFilter === "ALL"
      ? measurements
      : measurements.filter(
          (measurement) => measurement.source === sourceFilter,
        );

  const displayedStationIds = new Set(
    displayedMeasurements.map((measurement) => measurement.station.id),
  );

  const displayedStationNames = new Set(
    displayedMeasurements.map((measurement) => measurement.station.name),
  );

  const displayedStations = stations.filter((station) =>
    displayedStationIds.has(station.id),
  );

  const displayedAlerts =
    sourceFilter === "ALL"
      ? alerts
      : alerts.filter((alert) =>
          displayedStationNames.has(alert.stationName),
        );

  const simulatedMeasurements = measurements.filter(
    (measurement) => measurement.source === "SIMULATED",
  );

  const simulatedStationOptions = simulatedMeasurements.map(
    (measurement) => measurement.station,
  );

  const historyStationId =
    selectedHistoryStationId ?? simulatedStationOptions[0]?.id ?? null;

  const pollutantValues = displayedMeasurements
    .map((measurement) =>
      getMeasurementValue(selectedPollutant, measurement),
    )
    .filter((value): value is number => value !== null && value !== undefined);

  const aqiValues = displayedMeasurements
    .map((measurement) => measurement.aqiUs)
    .filter((value): value is number => value !== null && value !== undefined);

  const useAqiAverage =
    pollutantValues.length === 0 &&
    sourceFilter === "IQAIR" &&
    aqiValues.length > 0;

  const averageValues = useAqiAverage ? aqiValues : pollutantValues;

  const average =
    averageValues.length > 0
      ? averageValues.reduce((sum, value) => sum + value, 0) /
        averageValues.length
      : null;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Santa Cruz de la Sierra, Bolivia</p>
          <h1>AireSCZ</h1>
          <p>Dashboard georreferenciado de calidad del aire</p>
        </div>

        <span className="connection-status">Backend conectado</span>
      </header>

      <section className="map-dashboard">
        <div className="map-canvas">
          <AirQualityMap
            stations={displayedStations}
            measurements={displayedMeasurements}
            pollutant={selectedPollutant}
            showStations={showStations}
            showHalo={showHalo}
          />
        </div>

        <aside className="map-sidebar">
          <div className="sidebar-brand">
            <h2>CALIDAD DEL AIRE</h2>
            <p>Monitoreo geoespacial ambiental</p>
          </div>

          <div className="main-indicator">
            <strong>{average !== null ? average.toFixed(1) : "N/D"}</strong>
            <span>
              {useAqiAverage
                ? "Promedio AQI US"
                : `Promedio de ${pollutantLabels[selectedPollutant]}`}
            </span>
            <small>
              {useAqiAverage ? "índice" : pollutantUnits[selectedPollutant]}
            </small>
          </div>

          <div className="sidebar-section">
            <h3>Filtros</h3>

            <label>
              Contaminante
              <select
                value={selectedPollutant}
                onChange={(event) =>
                  setSelectedPollutant(event.target.value as Pollutant)
                }
              >
                <option value="PM25">PM2.5</option>
                <option value="CO">CO</option>
                <option value="O3">O₃</option>
              </select>
            </label>

            <label>
              Cobertura
              <select defaultValue="all-city">
                <option value="all-city">Toda Santa Cruz</option>
                <option value="urban-zone">Zona urbana</option>
              </select>
            </label>
          </div>

          <div className="sidebar-section">
            <h3>Fuente de datos</h3>

            <div className="source-filter">
              <button
                type="button"
                className={sourceFilter === "ALL" ? "active" : ""}
                onClick={() => setSourceFilter("ALL")}
              >
                Todos
              </button>

              <button
                type="button"
                className={sourceFilter === "SIMULATED" ? "active" : ""}
                onClick={() => setSourceFilter("SIMULATED")}
              >
                Simulados
              </button>

              <button
                type="button"
                className={sourceFilter === "IQAIR" ? "active" : ""}
                onClick={() => setSourceFilter("IQAIR")}
              >
                API real
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Capas visuales</h3>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showStations}
                onChange={(event) =>
                  setShowStations(event.target.checked)
                }
              />
              Estaciones de monitoreo
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showHalo}
                onChange={(event) =>
                  setShowHalo(event.target.checked)
                }
              />
              Halo de concentración
            </label>
          </div>

          <div className="sidebar-section">
            <h3>Actualizar datos reales</h3>

            <button
              type="button"
              className="sync-api-button"
              onClick={handleSyncIqair}
              disabled={syncingIqair}
            >
              {syncingIqair ? "Actualizando..." : "Actualizar API real"}
            </button>

            {syncIqairError && (
              <p className="sync-api-error">
                Error: {syncIqairError.message}
              </p>
            )}
          </div>

          <div className="sidebar-section">
            <h3>Leyenda</h3>

            <div className="legend-item">
              <span className="legend-color normal" />
              Normal
            </div>

            <div className="legend-item">
              <span className="legend-color moderate" />
              Moderada
            </div>

            <div className="legend-item">
              <span className="legend-color high" />
              Alta
            </div>

            <div className="legend-item">
              <span className="legend-color critical" />
              Crítica
            </div>
          </div>

          <div className="sidebar-note">
            <strong>{displayedStations.length}</strong> estaciones visibles
            <br />
            <strong>{displayedAlerts.length}</strong> alertas visibles
            <p>
              Mostrando fuente:{" "}
              <strong>{sourceFilterLabels[sourceFilter]}</strong>
            </p>
            <p>
              El halo es una visualización preliminar. La interpolación IDW
              se implementará en la siguiente fase SIG.
            </p>
          </div>
        </aside>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Estaciones visibles</span>
          <strong>{displayedStations.length}</strong>
        </article>

        <article className="summary-card">
          <span>Mediciones visibles</span>
          <strong>{displayedMeasurements.length}</strong>
        </article>

        <article className="summary-card">
          <span>Alertas visibles</span>
          <strong>{displayedAlerts.length}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Últimas mediciones por estación</h2>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Estación</th>
                <th>Fecha y hora</th>
                <th>PM2.5</th>
                <th>CO</th>
                <th>O₃</th>
                <th>AQI US</th>
                <th>Principal</th>
                <th>Fuente</th>
              </tr>
            </thead>

            <tbody>
              {displayedMeasurements.map((measurement) => (
                <tr key={measurement.station.id}>
                  <td>{measurement.station.name}</td>
                  <td>{formatDate(measurement.recordedAt)}</td>
                  <td>{formatPm25Value(measurement)}</td>
                  <td>{formatNullableValue(measurement.co, "ppm")}</td>
                  <td>{formatNullableValue(measurement.o3, "ppb")}</td>
                  <td>{measurement.aqiUs ?? "N/D"}</td>
                  <td>{measurement.mainPollutant || "N/D"}</td>
                  <td>
                    <span
                      className={`source-badge ${measurement.source.toLowerCase()}`}
                    >
                      {measurement.source === "IQAIR" ? "IQAir" : "Simulado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading-row">
          <div>
            <h2>Historial de datos simulados</h2>
            <p>
              Serie temporal por estación para PM2.5, CO y O₃. Puedes ajustar
              el rango de días para revisar datos recientes.
            </p>
          </div>

          <div className="history-controls">
            <label className="history-selector">
              Estación
              <select
                value={historyStationId ?? ""}
                onChange={(event) =>
                  setSelectedHistoryStationId(Number(event.target.value))
                }
              >
                {simulatedStationOptions.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-selector">
              Rango
              <select
                value={historyDays}
                onChange={(event) =>
                  setHistoryDays(Number(event.target.value))
                }
              >
                <option value={7}>Últimos 7 días</option>
                <option value={15}>Últimos 15 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={60}>Últimos 60 días</option>
              </select>
            </label>
          </div>
        </div>

        {historyStationId ? (
          <HistoricalChart
            key={`${historyStationId}-${historyDays}`}
            stationId={historyStationId}
            days={historyDays}
          />
        ) : (
          <p>No hay estaciones simuladas disponibles.</p>
        )}
      </section>

      <section className="panel">
        <h2>Alertas actuales</h2>

        {displayedAlerts.length === 0 ? (
          <p>No hay alertas para la fuente seleccionada.</p>
        ) : (
          <div className="alerts-list">
            {displayedAlerts.map((alert) => (
              <article
                className={`alert-card ${alert.level.toLowerCase()}`}
                key={alert.id}
              >
                <strong>
                  {alert.level}: {alert.pollutant}
                </strong>

                <p>{alert.message}</p>
                <small>{formatDate(alert.recordedAt)}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;