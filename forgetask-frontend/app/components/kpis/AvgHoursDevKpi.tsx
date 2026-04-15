// src/components/kpis/AvgHoursDevKpi.tsx
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

  // Porcentaje respecto al esperado
  const percentage = activeExpected > 0
    ? Math.round((avg / activeExpected) * 100)
    : 0;

  const maxVisual    = 140;
  const BAR_VALUES   = [71, 15, 14] as const;
  const markerPosition = Math.min((percentage / maxVisual) * 100, 100);

  return (
    <KpiCard
      title="Avg. Horas / Dev"
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
                  {m === "project" ? "Proyecto" : "Sprint"}
                </button>
              ))}
            </div>
          )}


          {/* ── CategoryBar con marcador ── */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-muted-foreground px-0.5">
              <span>Normal (≤100%)</span>
              <span>Extra (≤120%)</span>
              <span>Burnout</span>
            </div>

            <CategoryBar
              values={[...BAR_VALUES]}
              colors={["emerald", "amber", "rose"]}
              marker={{ value: markerPosition }}
              className="py"
            />

            <div className="flex justify-between text-xs text-muted-foreground tabular-nums px-0.5">
              <span>0%</span>
              <span>71%</span>
              <span>86%</span>
              <span>100%+</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground border-t border-border pt-3">
            <span className="font-semibold text-foreground">{totalDevs}</span> devs ·{" "}
            <span className="font-semibold text-foreground">{activeHours}</span> hrs totales
          </p>
        </div>
      }
    />
  );
}
