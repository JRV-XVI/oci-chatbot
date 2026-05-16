// src/components/kpis/AvgTasksKpi.tsx
"use client";

import React from "react";
import { Users } from "lucide-react";
import KpiCard from "../ui/kpiCard";

interface AvgTasksKpiProps {
  totalTasks: number;
  totalDevs: number;
  sprintTasks?: number;
  sprintDevs?: number;
}

export default function AvgTasksKpi({
  totalTasks,
  totalDevs,
  sprintTasks,
  sprintDevs,
}: AvgTasksKpiProps) {
  const [mode, setMode] = React.useState<"project" | "sprint">("project");

  const activeTasks = mode === "project" ? totalTasks : (sprintTasks ?? 0);
  const activeDevs  = mode === "project" ? totalDevs  : (sprintDevs ?? totalDevs);
  const hasSprintData = sprintTasks !== undefined;
  const activeScopeLabel = mode === "project" ? "in project scope" : "in current sprint";

  // Cálculo del promedio
  const avg = activeDevs > 0
    ? Math.round((activeTasks / activeDevs) * 10) / 10
    : 0;

  return (
    <KpiCard
      title="Average tasks per developer"
      icon={<Users />}
      value={avg}
      suffix="tasks"
      bottomContent={
        <div className="flex flex-col gap-4 w-full">

          {hasSprintData && (
            <div className="flex rounded-lg border border-border overflow-hidden self-start w-full">
              {(["project", "sprint"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={[
                    "flex-1 py-2.5 px-4 text-sm font-medium transition-colors",
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {m === "project" ? "Project" : "Sprint"}
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{activeDevs}</span>{" "}
            devs {activeScopeLabel}
          </p>

          {/* ── CategoryBar con marcador ── */}
          {/* <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-muted-foreground px-0.5">
              <span>Saludable</span>
              <span>Riesgo</span>
              <span>Crítico</span>
            </div>

            <div className="relative">
              <CategoryBar
                values={[greenPct, yellowPct, redPct]}
                colors={["emerald", "amber", "rose"]}
                marker={{
                  value: markerValue,
                  tooltip: `Carga actual: ${avg} tareas/dev`,
                  showAnimation: true,
                }}
                className="py-1"
                showLabels={false}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground tabular-nums px-0.5">
              <span>0</span>
              <span>{currentHealthyMax}</span>
              <span>{currentWarningMax}</span>
              <span>{currentDangerMax}+</span>
            </div>

            <p className="kpi-explainer-text">
              Valor actual: <span className="font-semibold text-foreground">{avg}</span> tareas por dev.
            </p>
          </div> */}
        </div>
      }
    />
  );
}
