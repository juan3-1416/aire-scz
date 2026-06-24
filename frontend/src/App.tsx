import { useState } from "react";
import { useQuery } from "@apollo/client/react";

import AirQualityMap from "./components/AirQualityMap";
import { GET_INITIAL_DATA } from "./graphql/queries";
import type {
  InitialData,
  Pollutant,
} from "./types/airQuality";

import "./App.css";

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

function getMeasurementValue(
  pollutant: Pollutant,
  value: {
    pm25: number;
    co: number;
    o3: number;
  },
) {
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

function App() {
  const [selectedPollutant, setSelectedPollutant] =
    useState<Pollutant>("PM25");

  const [showStations, setShowStations] = useState(true);
  const [showHalo, setShowHalo] = useState(true);

  const { data, loading, error, refetch } = useQuery<InitialData>(
    GET_INITIAL_DATA,
  );

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

  const values = measurements.map((measurement) =>
    getMeasurementValue(selectedPollutant, measurement),
  );

  const average =
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Santa Cruz de la Sierra, Bolivia</p>
          <h1>AireSCZ</h1>
          <p>Dashboard georreferenciado de calidad del aire</p>
        </div>

        <span className="connection-status">
          Backend conectado
        </span>
      </header>

      <section className="map-dashboard">
        <div className="map-canvas">
          <AirQualityMap
            stations={stations}
            measurements={measurements}
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
            <strong>{average.toFixed(1)}</strong>
            <span>
              Promedio de {pollutantLabels[selectedPollutant]}
            </span>
            <small>{pollutantUnits[selectedPollutant]}</small>
          </div>

          <div className="sidebar-section">
            <h3>Filtros</h3>

            <label>
              Contaminante
              <select
                value={selectedPollutant}
                onChange={(event) =>
                  setSelectedPollutant(
                    event.target.value as Pollutant,
                  )
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
            <strong>{stations.length}</strong> estaciones activas
            <br />
            <strong>{alerts.length}</strong> alertas actuales
            <p>
              El halo es una visualización preliminar. La interpolación IDW
              se implementará en la siguiente fase SIG.
            </p>
          </div>
        </aside>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Estaciones activas</span>
          <strong>{stations.length}</strong>
        </article>

        <article className="summary-card">
          <span>Mediciones actuales</span>
          <strong>{measurements.length}</strong>
        </article>

        <article className="summary-card">
          <span>Alertas actuales</span>
          <strong>{alerts.length}</strong>
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
              </tr>
            </thead>

            <tbody>
              {measurements.map((measurement) => (
                <tr key={measurement.station.id}>
                  <td>{measurement.station.name}</td>
                  <td>{formatDate(measurement.recordedAt)}</td>
                  <td>{measurement.pm25.toFixed(2)} µg/m³</td>
                  <td>{measurement.co.toFixed(2)} ppm</td>
                  <td>{measurement.o3.toFixed(2)} ppb</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Alertas actuales</h2>

        {alerts.length === 0 ? (
          <p>No hay alertas en las últimas mediciones.</p>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
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