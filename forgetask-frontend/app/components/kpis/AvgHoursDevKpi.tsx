"use client";

import React from "react";
import { Clock4 } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { CategoryBar } from "../ui/CategoryBar";

interface AvgHoursDevKpiProps {
  totalHours: number;
  totalDevs: number;
  expectedHoursPerDev?: number;
  sprintRealHours?: number;
  sprintEstimatedHours?: number;
}

export default function AvgHoursDevKpi({
  totalHours,
  totalDevs,
  expectedHoursPerDev = 80,
  sprintRealHours,
  sprintEstimatedHours,
}: AvgHoursDevKpiProps) {

  const [mode, setMode] = React.useState<"project" | "sprint">("project");

  const hasSprintData = sprintRealHours !== undefined && sprintEstimatedHours !== undefined;

  // ── Datos activos según el toggle ──
  const activeHours    = mode === "project" ? totalHours         : (sprintRealHours ?? 0);
  const activeExpected = mode === "project" ? expectedHoursPerDev
    : sprintEstimatedHours! > 0 && totalDevs > 0
      ? Math.round((sprintEstimatedHours! / totalDevs) * 10) / 10  // ← horas esperadas del sprint / devs
      : expectedHoursPerDev;

  // ── Cálculo del promedio ──
  const avg = totalDevs > 0
    ? Math.round((activeHours / totalDevs) * 10) / 10
    : 0;

  // ── Porcentaje respecto al esperado ──
  const percentage = activeExpected > 0
    ? Math.round((avg / activeExpected) * 100)
    : 0;

  const maxVisual   = 140;
  const BAR_VALUES  = [71, 15, 14] as const;
  const BAR_COLORS  = ["emerald", "amber", "rose"] as const;

  const markerPosition = Math.min((percentage / maxVisual) * 100, 100);

  const health =
    percentage <= 100
      ? { label: "Carga normal",           color: "text-emerald-500", badgeType: "up"      as const }
      : percentage <= 120
      ? { label: "Horas extra detectadas", color: "text-amber-500",   badgeType: "neutral" as const }
      : { label: "Riesgo de Burnout",      color: "text-destructive", badgeType: "down"    as const };

  return (
    <KpiCard
      title="Promedio de horas por dev"
      value={avg}
      suffix="hrs"
      icon={<Clock4 size={18} />}
      badge={`${percentage}% de ${activeExpected} hrs esperadas`}
      badgeType={health.badgeType}
      bottomContent={
        <div className="mt-1 w-full">

          {/* ── Toggle ── */}
          {hasSprintData && (
            <div className="flex items-center gap-1 mb-4 p-0.5 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setMode("project")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  mode === "project"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Proyecto
              </button>
              <button
                onClick={() => setMode("sprint")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  mode === "sprint"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sprint actual
              </button>
            </div>
          )}

          {/* ── Estado de salud ── */}
          <div className="flex justify-between text-xs mb-1.5">
            <span className={`${health.color} font-medium`}>{health.label}</span>
            <span className="text-muted-foreground">Esperado: {activeExpected} hrs</span>
          </div>

          {/* ── CategoryBar ── */}
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

          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 opacity-60">
            <span>0</span>
            <span>100% ({activeExpected}h)</span>
            <span>120%+</span>
          </div>

        </div>
      }
    />
  );
}