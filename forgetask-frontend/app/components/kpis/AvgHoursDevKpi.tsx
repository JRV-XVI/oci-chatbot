// src/components/kpis/AvgHoursDevKpi.tsx
"use client";

import React from "react";
import { Clock4 } from "lucide-react";
import KpiCard from "../ui/kpiCard";

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

  const hasSprintData =
    sprintRealHours !== undefined && sprintEstimatedHours !== undefined;

  // Datos activos según el toggle
  const activeHours    = mode === "project" ? totalHours : (sprintRealHours ?? 0);
  const activeExpected =
    mode === "project"
      ? expectedHoursPerDev
      : sprintEstimatedHours! > 0 && totalDevs > 0
      ? Math.round((sprintEstimatedHours! / totalDevs) * 10) / 10
      : expectedHoursPerDev;

  // Cálculo del promedio
  const avg = totalDevs > 0
    ? Math.round((activeHours / totalDevs) * 10) / 10
    : 0;

  return (
    <KpiCard
      title="Average hours per developer"
      icon={<Clock4 />}
      value={avg}
      suffix="hrs"
      bottomContent={
        <div className="flex flex-col gap-4 w-full">

          {hasSprintData && (
            <div className="flex rounded-lg border border-border overflow-hidden w-full">
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
          {/* ── CategoryBar con marcador ── */}
          {/* <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-muted-foreground px-0.5">
              <span>Normal (≤100%)</span>
              <span>Extra (≤120%)</span>
              <span>Burnout</span>
            </div>

            <CategoryBar
              values={[...BAR_VALUES]}
              colors={["emerald", "amber", "rose"]}
              marker={{
                value: markerPosition,
                tooltip: `${percentage}% del objetivo por dev`,
                showAnimation: true,
              }}
              className="py-1"
              showLabels={false}
            />

            <div className="flex justify-between text-xs text-muted-foreground tabular-nums px-0.5">
              <span>0%</span>
              <span>100%</span>
              <span>120%</span>
              <span>140%+</span>
            </div>

            <p className="kpi-explainer-text">
              Estado actual: <span className="font-semibold text-foreground">{percentage}%</span> del objetivo por dev.
            </p>
          </div> */}

          <p className="text-sm text-muted-foreground">
            Target per dev: <span className="font-semibold text-foreground">{activeExpected}</span> hrs
          </p>

          <p className="text-sm text-muted-foreground border-t border-border pt-3">
            <span className="font-semibold text-foreground">{totalDevs}</span> devs ·{" "}
            <span className="font-semibold text-foreground">{activeHours}</span> total hrs
          </p>
        </div>
      }
    />
  );
}
