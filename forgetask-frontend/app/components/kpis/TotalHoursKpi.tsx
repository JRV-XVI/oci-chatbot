// src/components/kpis/TotalHoursKpi.tsx
import { Clock } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { AvailableChartColorsKeys } from "../ui/DonutChart";
import { ProgressBar } from "../ui/ProgressBar";

interface TotalHoursKpiProps {
  realHours: number;
  estimatedHours: number;
}

export default function TotalHoursKpi({ realHours, estimatedHours }: TotalHoursKpiProps) {
  const percentage = (realHours / estimatedHours) * 100;

  let healthColor: AvailableChartColorsKeys = "orange";
  if (percentage > 85 && percentage <= 100) healthColor = "orangeSoft";
  if (percentage > 100) healthColor = "orangeDeep";

  const normalizedPercentage = Number.isFinite(percentage)
    ? Math.max(0, Math.round(percentage))
    : 0;

  const badgeType =
    normalizedPercentage <= 85
      ? "neutral"
      : normalizedPercentage <= 100
      ? "up"
      : "down";

  const badgeLabel =
    normalizedPercentage <= 85
      ? "En progreso"
      : normalizedPercentage <= 100
      ? "En objetivo"
      : `Excedido ${normalizedPercentage - 100}%`;

  return (
    <KpiCard
      title="Total de Horas"
      icon={<Clock />}
      value={realHours}
      suffix="hrs"
      badge={badgeLabel}
      badgeType={badgeType}
      progressData={{
        value: realHours,
        target: estimatedHours,
        label: `Horas reales · estimadas: ${estimatedHours} hrs`,
        color: healthColor,
      }}
    />
  );
}
