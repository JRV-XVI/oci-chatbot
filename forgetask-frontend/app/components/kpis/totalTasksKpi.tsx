import { CheckSquare } from "lucide-react";
import KpiCard from "../ui/kpiCard";

// Aquí recibes tus datos calculados como prop o desde un hook/API
interface TotalTasksKpiProps {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
}

export default function TotalTasksKpi({ total, done, inProgress, todo }: TotalTasksKpiProps) {
  const donutData = [
    { name: "Completadas", value: done, color: "emerald" },
    { name: "En progreso", value: inProgress, color: "blue" },
    { name: "Pendientes", value: todo, color: "slate" },
  ];

  return (
    <KpiCard
        title="Total Tasks"
        value={142}
        badge="+12 esta semana"
        badgeType="up"
        donutData={[
            { name: "Completadas", value: 92 },
            { name: "En progreso", value: 28 },
            { name: "Pendientes", value: 22 },
        ]}
        donutColors={["emerald", "amber", "indigo"]} // ← orden = mismo orden del array de datos
        icon={<CheckSquare size={18} />}
    />
  );
}