// src/components/kpis/TotalHoursKpi.tsx
import { Clock } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { AvailableChartColorsKeys } from "../ui/DonutChart";

interface TotalHoursKpiProps {
  realHours: number;
  estimatedHours: number;
}

export default function TotalHoursKpi({ realHours, estimatedHours }: TotalHoursKpiProps) {
  const percentage = estimatedHours > 0 ? (realHours / estimatedHours) * 100 : 0;

  let healthColor: AvailableChartColorsKeys = "orange";
  if (percentage > 85 && percentage <= 100) healthColor = "orangeSoft";
  if (percentage > 100) healthColor = "orangeDeep";

  return (
    <KpiCard
      title="Hours consumed vs plan"
      icon={<Clock />}
      value={realHours}
      suffix="hrs"
      progressData={{
        value: realHours,
        target: estimatedHours,
        label: `Actual vs estimated hours: ${estimatedHours} hrs`,
        color: healthColor,
      }}
    />
  );
}
