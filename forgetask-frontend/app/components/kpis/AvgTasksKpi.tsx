"use client";

import React from "react";
import { Users } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { CategoryBar } from "../ui/CategoryBar";

interface AvgTasksKpiProps {
  totalTasks: number;
  totalDevs: number;
  sprintTasks?: number;
  sprintDevs?: number;
  healthyMax?: number;
  warningMax?: number;
  dangerMax?: number;
}

export default function AvgTasksKpi({
  totalTasks,
  totalDevs,
  sprintTasks,
  sprintDevs,
  healthyMax = 10,
  warningMax = 18,
  dangerMax = 28,
}: AvgTasksKpiProps) {

  const [mode, setMode] = React.useState<"project" | "sprint">("project");

  const activeTasks = mode === "project" ? totalTasks : (sprintTasks ?? 0);
  const activeDevs  = mode === "project" ? totalDevs  : (sprintDevs  ?? totalDevs);
  const hasSprintData = sprintTasks !== undefined;
  const activeScopeLabel = mode === "project" ? "en el proyecto" : "en sprint actual";

  // ── Umbrales dinámicos por modo ──
  // Proyecto usa una escala más amplia que sprint.
  const currentHealthyMax = mode === "project" ? healthyMax * 4 : healthyMax;
  const currentWarningMax = mode === "project" ? warningMax * 4 : warningMax;
  const currentDangerMax  = mode === "project" ? dangerMax  * 4 : dangerMax;

  // ── Cálculo del promedio ──
  const avg = activeDevs > 0
    ? Math.round((activeTasks / activeDevs) * 10) / 10
    : 0;

  // ── Lógica de salud (texto e ícono del badge) ──
  let healthLabel: string;
  let badgeType: "up" | "down" | "neutral";

  if (avg <= currentHealthyMax) {
    healthLabel = "Carga saludable";
    badgeType = "up";
  } else if (avg <= currentWarningMax) {
    healthLabel = "Riesgo de sobrecarga";
    badgeType = "neutral";
  } else {
    healthLabel = "Equipo sobrecargado";
    badgeType = "down";
  }

  // ── Zonas de la CategoryBar ──
  // Los valores representan PORCENTAJES de la barra (deben sumar 100)
  const greenPct  = Math.round((currentHealthyMax / currentDangerMax) * 100);
  const yellowPct = Math.round(((currentWarningMax - currentHealthyMax) / currentDangerMax) * 100);
  const redPct    = 100 - greenPct - yellowPct;

  return (
    <KpiCard
      title="Promedio de tareas por dev"
      value={avg}
      suffix="tareas/dev"
      icon={<Users size={18} />}
      badge={`${activeDevs} developers ${activeScopeLabel}`}
      badgeType={badgeType}
      bottomContent={
        <div className="mt-0 w-full">

          {/* ── Toggle — solo aparece si hay datos del sprint ── */}
          {hasSprintData && (
            <div className="flex items-center gap-1 mb-1 p-0.5 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setMode("project")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
                  mode === "project"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Proyecto
              </button>
              <button
                onClick={() => setMode("sprint")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
                  mode === "sprint"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sprint actual
              </button>
            </div>
          )}

          {/* ── Etiquetas de estado ── */}
          <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
            <span className={
              avg <= currentHealthyMax ? "text-primary font-medium" :
              avg <= currentWarningMax ? "text-[#f19367] font-medium" :
                                  "text-[#ffb28e] font-medium"
            }>
              {healthLabel}
            </span>
            <span>Máx: {currentDangerMax}</span>
          </div>

          {/* ── CategoryBar ── */}
          <CategoryBar
            values={[greenPct, yellowPct, redPct]}
            colors={["slateLight", "orangeSoft", "orange"]}
            marker={{
              value: Math.min((avg / currentDangerMax) * 100, 100),
              tooltip: `${avg} tasks/dev`,
              showAnimation: true,
            }}
            showLabels={false}
            className="h-1.5"
          />

          <div className="flex justify-between text-[9px] text-muted-foreground mt-0 opacity-60">
            <span>0</span>
            <span>{currentHealthyMax}</span>
            <span>{currentWarningMax}</span>
            <span>{currentDangerMax}+</span>
          </div>

        </div>
      }
    />
  );
}