import { useQuery } from "@apollo/client/react";

import { GET_INITIAL_DATA } from "./graphql/queries";
import "./App.css";

type Station = {
  id: number;
  name: string;
  zone: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
};

type LatestMeasurement = {
  station: {
    id: number;
    name: string;
    zone: string;
  };
  recordedAt: string;
  pm25: number;
  co: number;
  o3: number;
};

type CurrentAlert = {
  id: number;
  stationName: string;
  pollutant: string;
  level: string;
  value: number;
  unit: string;
  message: string;
  recordedAt: string;
};

type InitialData = {
  healthCheck: string;
  stations: Station[];
  latestMeasurements: LatestMeasurement[];
  currentAlerts: CurrentAlert[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function App() {
  const { data, loading, error, refetch } = useQuery<InitialData>(
    GET_INITIAL_DATA,
  );

  if (loading) {
    return <main className="state-message">Cargando datos de AireSCZ...</main>;
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
        <div className="panel-heading">
          <div>
            <h2>Estaciones registradas</h2>
            <p>{data?.healthCheck}</p>
          </div>
        </div>

        <div className="stations-grid">
          {stations.map((station) => (
            <article className="station-card" key={station.id}>
              <h3>{station.name}</h3>
              <p>{station.zone}</p>
              <small>
                Lat: {station.latitude.toFixed(4)} · Long:{" "}
                {station.longitude.toFixed(4)}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Últimas mediciones</h2>

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
          <p>No hay alertas para las últimas mediciones.</p>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
              <article className={`alert-card ${alert.level.toLowerCase()}`} key={alert.id}>
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