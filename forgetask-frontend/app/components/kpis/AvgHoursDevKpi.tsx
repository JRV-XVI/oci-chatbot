"use client";

import React from "react";
import { Clock4 } from "lucide-react";
import KpiCard from "../ui/kpiCard";

interface AvgHoursDevKpiProps {
  totalHours: number;
  totalDevs: number;
  expectedHoursPerDev?: number;
  medianHoursPerDev?: number;
}

export default function AvgHoursDevKpi({
  totalHours,
  totalDevs,
  expectedHoursPerDev = 0,
  medianHoursPerDev,
}: AvgHoursDevKpiProps) {
  const [mode, setMode] = React.useState<"average" | "median">("average");

  const avg = totalDevs > 0
    ? Math.round((totalHours / totalDevs) * 10) / 10
    : 0;

  const hasMedian = medianHoursPerDev !== undefined;
  const displayValue = mode === "average" ? avg : (medianHoursPerDev ?? 0);

  return (
    <KpiCard
      title="Hours per developer"
      icon={<Clock4 />}
      value={displayValue}
      decimalPlaces={1}
      suffix="hrs"
      bottomContent={
        <div className="flex flex-col gap-4 w-full">
          {hasMedian && (
            <div className="flex rounded-lg border border-border overflow-hidden w-full">
              {(["average", "median"] as const).map((m) => (
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
                  {m === "average" ? "Average" : "Median"}
                </button>
              ))}
            </div>
          )}

          {expectedHoursPerDev > 0 && (
            <p className="text-sm text-muted-foreground">
              Target per dev:{" "}
              <span className="font-semibold text-foreground">{expectedHoursPerDev}</span> hrs
            </p>
          )}

          <p className="text-sm text-muted-foreground border-t border-border pt-3">
            <span className="font-semibold text-foreground">{totalDevs}</span> devs ·{" "}
            <span className="font-semibold text-foreground">{totalHours}</span> total hrs
          </p>
        </div>
      }
    />
  );
}