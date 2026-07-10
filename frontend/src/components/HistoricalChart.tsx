import { useQuery } from "@apollo/client/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GET_STATION_HISTORY } from "../graphql/queries";

import "./HistoricalChart.css";

type HistoricalMeasurement = {
  id: number;
  recordedAt: string;
  pm25: number | null;
  co: number | null;
  o3: number | null;
  source: "SIMULATED" | "IQAIR";
};

type HistoryData = {
  measurements: HistoricalMeasurement[];
};

type HistoricalChartProps = {
  stationId: number;
};

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
  }).format(new Date(value));
}

export default function HistoricalChart({ stationId }: HistoricalChartProps) {
  const { data, loading, error } = useQuery<HistoryData>(
    GET_STATION_HISTORY,
    {
      variables: {
        stationId,
        limit: 500,
      },
    },
  );

  if (loading) {
    return <p>Cargando historial simulado...</p>;
  }

  if (error) {
    return <p>No se pudo cargar el historial: {error.message}</p>;
  }

  const chartData =
    data?.measurements
      .filter((measurement) => measurement.source === "SIMULATED")
      .map((measurement) => ({
        fecha: formatDateLabel(measurement.recordedAt),
        pm25: measurement.pm25,
        co: measurement.co,
        o3: measurement.o3,
      })) ?? [];

  if (chartData.length === 0) {
    return <p>No hay datos simulados históricos para esta estación.</p>;
  }

  return (
    <div className="historical-chart">
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="fecha"
            minTickGap={32}
          />
          <YAxis />
          <Tooltip />
          <Legend />

          <Line
            type="monotone"
            dataKey="pm25"
            name="PM2.5 µg/m³"
            strokeWidth={2}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="co"
            name="CO ppm"
            strokeWidth={2}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="o3"
            name="O₃ ppb"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}