"use client";

import React from "react";
import { Users } from "lucide-react";
import KpiCard from "../ui/kpiCard";

interface AvgTasksKpiProps {
  totalTasks: number;
  totalDevs: number;
  medianTasksPerDev?: number;
}

export default function AvgTasksKpi({
  totalTasks,
  totalDevs,
  medianTasksPerDev,
}: AvgTasksKpiProps) {
  const [mode, setMode] = React.useState<"average" | "median">("average");

  const avg = totalDevs > 0
    ? Math.round((totalTasks / totalDevs) * 10) / 10
    : 0;

  const hasMedian = medianTasksPerDev !== undefined;
  const displayValue = mode === "average" ? avg : (medianTasksPerDev ?? 0);

  return (
    <KpiCard
      title="Tasks per developer"
      icon={<Users />}
      value={displayValue}
      decimalPlaces={1}
      suffix="tasks"
      bottomContent={
        <div className="flex flex-col gap-4 w-full">
          {hasMedian && (
            <div className="flex rounded-lg border border-border overflow-hidden self-start w-full">
              {(["average", "median"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={[
                    "flex-1 py-2.5 px-4 text-sm font-medium transition-colors capitalize",
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

          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalDevs}</span>{" "}
            devs ·{" "}
            <span className="font-semibold text-foreground">{totalTasks}</span>{" "}
            total tasks
          </p>
        </div>
      }
    />
  );
}