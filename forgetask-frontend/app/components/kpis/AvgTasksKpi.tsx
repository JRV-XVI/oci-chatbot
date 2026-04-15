// src/components/kpis/AvgTasksKpi.tsx
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
  const activeDevs  = mode === "project" ? totalDevs  : (sprintDevs ?? totalDevs);
  const hasSprintData = sprintTasks !== undefined;
  const activeScopeLabel = mode === "project" ? "en el proyecto" : "en sprint actual";

  // Umbrales dinámicos por modo
  const currentHealthyMax = mode === "project" ? healthyMax * 4 : healthyMax;
  const currentWarningMax = mode === "project" ? warningMax * 4 : warningMax;
  const currentDangerMax  = mode === "project" ? dangerMax  * 4 : dangerMax;

  // Cálculo del promedio
  const avg = activeDevs > 0
    ? Math.round((activeTasks / activeDevs) * 10) / 10
    : 0;

  // Lógica de salud
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

  // Zonas de la CategoryBar (porcentajes que suman 100)
  const greenPct  = Math.round((currentHealthyMax / currentDangerMax) * 100);
  const yellowPct = Math.round(((currentWarningMax - currentHealthyMax) / currentDangerMax) * 100);
  const redPct    = 100 - greenPct - yellowPct;

  return (
    <KpiCard
      title="Avg. Tareas / Dev"
      icon={<Users />}
      value={avg}
      suffix="tareas"
      badge={healthLabel}
      badgeType={badgeType}
      bottomContent={
        <div className="flex flex-col gap-4 w-full">

          {/* ✅ CAMBIO: Toggle Project/Sprint — botones más grandes, mejor touch target */}
          {hasSprintData && (
            <div className="flex rounded-lg border border-border overflow-hidden self-start w-full">
              {(["project", "sprint"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  // ✅ CAMBIO: py-1 px-2 → py-2.5 px-4, text-xs → text-sm, mejor contraste activo
                  className={[
                    "flex-1 py-2.5 px-4 text-sm font-medium transition-colors",
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {m === "project" ? "Proyecto" : "Sprint"}
                </button>
              ))}
            </div>
          )}

          {/* ✅ CAMBIO: contexto del promedio más visible */}
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{activeDevs}</span>{" "}
            devs {activeScopeLabel}
          </p>

          {/* ── CategoryBar con marcador ── */}
          <div className="flex flex-col gap-2">
            {/* ✅ CAMBIO: leyenda de zonas más legible */}
            <div className="flex justify-between text-xs text-muted-foreground px-0.5">
              <span>Saludable</span>
              <span>Riesgo</span>
              <span>Crítico</span>
            </div>

            {/* ✅ CAMBIO: CategoryBar con más altura vía wrapper */}
            <div className="relative">
              <CategoryBar
                values={[greenPct, yellowPct, redPct]}
                colors={["emerald", "amber", "rose"]}
                // ✅ CAMBIO: marker mueve el marcador a la posición del avg
                marker={{ value: Math.min((avg / currentDangerMax) * 100, 100) }}
                className="py"
              />
            </div>

            {/* ✅ CAMBIO: escala de referencia bajo la barra */}
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums px-0.5">
              <span>0</span>
              <span>{currentHealthyMax}</span>
              <span>{currentWarningMax}</span>
              <span>{currentDangerMax}+</span>
            </div>
          </div>
        </div>
      }
    />
  );
}
