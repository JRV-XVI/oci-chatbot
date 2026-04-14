import { Clock } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { AvailableChartColorsKeys } from "../ui/DonutChart"; // O de donde exportes los tipos

interface TotalHoursKpiProps {
  realHours: number;
  estimatedHours: number;
}

export default function TotalHoursKpi({ realHours, estimatedHours }: TotalHoursKpiProps) {
  const percentage = (realHours / estimatedHours) * 100;
  
  let healthColor: AvailableChartColorsKeys = "orange";
  if (percentage > 85 && percentage <= 100) healthColor = "orangeSoft";
  if (percentage > 100) healthColor = "orangeDeep";

  return (
    <KpiCard
      title="Horas Realizadas en proyecto"
      value={realHours}
      suffix="hrs"
      icon={<Clock size={18} />}
      progressData={{
        value: realHours,
        target: estimatedHours,
        label: `Horas estimadas: ${estimatedHours} hrs`,
        color: healthColor
      }}
    />
  );
}