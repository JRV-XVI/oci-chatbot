// src/components/kpis/AvgTasksKpi.tsx
import { Users } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { CategoryBar } from "../ui/CategoryBar";

interface AvgTasksKpiProps {
  totalTasks: number;
  totalDevs: number;
  healthyMax?: number;
  warningMax?: number;
  dangerMax?: number;
}

export default function AvgTasksKpi({
  totalTasks,
  totalDevs,
  healthyMax = 10,
  warningMax = 18,
  dangerMax = 28,
}: AvgTasksKpiProps) {

  // ── Cálculo del promedio ──
  const avg = totalDevs > 0
    ? Math.round((totalTasks / totalDevs) * 10) / 10
    : 0;

  // ── Lógica de salud (texto e ícono del badge) ──
  let healthLabel: string;
  let badgeType: "up" | "down" | "neutral";

  if (avg <= healthyMax) {
    healthLabel = "Carga saludable";
    badgeType = "up";       // verde (text-primary en tu tema)
  } else if (avg <= warningMax) {
    healthLabel = "Riesgo de sobrecarga";
    badgeType = "neutral";  // ámbar/gris
  } else {
    healthLabel = "Equipo sobrecargado";
    badgeType = "down";     // rojo (text-destructive)
  }

  // ── Zonas de la CategoryBar ──
  // Los valores representan PORCENTAJES de la barra (deben sumar 100)
  // Zona verde: 0 → healthyMax
  // Zona amarilla: healthyMax → warningMax
  // Zona roja: warningMax → dangerMax
  const greenPct  = Math.round((healthyMax / dangerMax) * 100);         // ej: ~36%
  const yellowPct = Math.round(((warningMax - healthyMax) / dangerMax) * 100); // ej: ~29%
  const redPct    = 100 - greenPct - yellowPct;                         // resto: ~35%

  return (
    <KpiCard
      title="Promedio de tareas por dev"
      value={avg}
      suffix="tareas"
      icon={<Users size={18} />}
      badge={`${totalDevs} developers en el proyecto`}
      badgeType="neutral"
      bottomContent={
        <div className="mt-3 w-full">

          {/* Etiquetas de estado + número máximo */}
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span className={
              avg <= healthyMax    ? "text-primary font-medium" :
              avg <= warningMax   ? "text-amber-500 font-medium" :
                                    "text-destructive font-medium"
            }>
              {healthLabel}
            </span>
            <span>Máx: {dangerMax}</span>
          </div>

          {/* CategoryBar con marcador animado */}
          <CategoryBar
            values={[greenPct, yellowPct, redPct]}
            colors={["emerald", "amber", "rose"]}
            marker={{
              value: Math.min((avg / dangerMax) * 100, 100), // posición del marcador en %
              tooltip: `${avg} tasks/dev`,
              showAnimation: true,
            }}
            showLabels={false}
            className="h-2"
          />

          {/* Leyenda mínima debajo de la barra */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 opacity-60">
            <span>0</span>
            <span>{healthyMax}</span>
            <span>{warningMax}</span>
            <span>{dangerMax}+</span>
          </div>

        </div>
      }
    />
  );
}