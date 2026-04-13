// src/components/kpis/AvgHoursDevKpi.tsx
import { Clock4 } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { CategoryBar } from "../ui/CategoryBar";

interface AvgHoursDevKpiProps {
  totalHours: number;
  totalDevs: number;
  expectedHours?: number;
  periodLabel?: string;
}

export default function AvgHoursDevKpi({
  totalHours,
  totalDevs,
  expectedHours = 80,         // Por defecto: 1 sprint (2 semanas)
  periodLabel = "por sprint",
}: AvgHoursDevKpiProps) {

  // ── Cálculo del promedio ──
  const avg = totalDevs > 0
    ? Math.round((totalHours / totalDevs) * 10) / 10
    : 0;

  // ── Porcentaje respecto al esperado ──
  const percentage = Math.round((avg / expectedHours) * 100);

  // ── ZONA 1: Verde  → 0%   a 100% del esperado (trabajo normal)
  // ── ZONA 2: Ámbar  → 100% a 120% del esperado (horas extra)
  // ── ZONA 3: Rojo   → 120%+               (riesgo de burnout)
  // Con maxVisual=140, las fronteras 100% y 120% caen exactamente
  // en los límites de cada zona de la barra.
  const maxVisual = 140;

  // 100/140*100 ≈ 71  |  20/140*100 ≈ 15  |  resto = 14
  // Estos valores hacen que el marcador cruce la frontera EXACTAMENTE
  // cuando el porcentaje llega al umbral de cada zona.
  const BAR_VALUES  = [71, 15, 14] as const;
  const BAR_COLORS  = ["emerald", "amber", "rose"] as const;

  // Posición del marcador (0-100 sobre la barra visual)
  const markerPosition = Math.min((percentage / maxVisual) * 100, 100);

  // ── Lógica de salud (3 estados) ──
  const health =
    percentage <= 100
      ? { label: "Carga normal",            color: "text-emerald-500", badgeType: "up"      as const }
      : percentage <= 120
      ? { label: "Horas extra detectadas",  color: "text-amber-500",   badgeType: "neutral" as const }
      : { label: "Riesgo de Burnout",       color: "text-destructive", badgeType: "down"    as const };

  return (
    <KpiCard
      title="Promedio de horas por dev"
      value={avg}
      suffix="hrs"
      icon={<Clock4 size={18} />}
      badge={`${percentage}% de ${expectedHours} hrs ${periodLabel}`}
      badgeType={health.badgeType}
      bottomContent={
        <div className="mt-3 w-full">

          {/* Estado de salud + referencia */}
          <div className="flex justify-between text-xs mb-1.5">
            <span className={`${health.color} font-medium`}>
              {health.label}
            </span>
            <span className="text-muted-foreground">
              Esperado: {expectedHours} hrs
            </span>
          </div>

          {/* CategoryBar — 3 zonas */}
          <CategoryBar
            values={[...BAR_VALUES]}
            colors={[...BAR_COLORS]}
            marker={{
              value: markerPosition,
              tooltip: `${avg} hrs/dev (${percentage}%)`,
              showAnimation: true,
            }}
            showLabels={false}
            className="h-2"
          />

          {/* Leyenda simplificada — solo 3 puntos de referencia */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 opacity-60">
            <span>0</span>
            <span>100% ({expectedHours}h)</span>
            <span>120%+</span>
          </div>

        </div>
      }
    />
  );
}