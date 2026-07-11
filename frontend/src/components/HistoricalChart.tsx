import { useMemo } from "react";
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
  days: number;
};

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDateRange(days: number) {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setDate(endDate.getDate() - days);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export default function HistoricalChart({
  stationId,
  days,
}: HistoricalChartProps) {
  const dateRange = useMemo(() => getDateRange(days), [days]);

  const variables = useMemo(
    () => ({
      stationId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      source: "SIMULATED",
      limit: 5000,
    }),
    [stationId, dateRange.startDate, dateRange.endDate],
  );

  const { data, loading, error } = useQuery<HistoryData>(
    GET_STATION_HISTORY,
    {
      variables,
      fetchPolicy: "cache-and-network",
    },
  );

  if (loading && !data) {
    return <p>Cargando historial simulado...</p>;
  }

  if (error) {
    return <p>No se pudo cargar el historial: {error.message}</p>;
  }

  const chartData =
    data?.measurements
      .filter((measurement) => measurement.source === "SIMULATED")
      .sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() -
          new Date(b.recordedAt).getTime(),
      )
      .map((measurement) => ({
        fecha: formatDateLabel(measurement.recordedAt),
        pm25: measurement.pm25,
        co: measurement.co,
        o3: measurement.o3,
      })) ?? [];

  if (chartData.length === 0) {
    return (
      <p>
        No hay datos simulados históricos para esta estación en los últimos{" "}
        {days} días.
      </p>
    );
  }

  return (
    <div className="historical-chart">
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" minTickGap={32} />
          <YAxis />
        <Tooltip
  contentStyle={{
    background: "#081321",
    border: "1px solid rgba(75, 195, 255, 0.45)",
    borderRadius: "12px",
    color: "#eaf2ff",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.35)",
  }}
  labelStyle={{
    color: "#0050fc",
    fontWeight: 800,
    marginBottom: "6px",
  }}
  itemStyle={{
    color: "#eaf2ff",
    fontWeight: 700,
  }}
/>
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