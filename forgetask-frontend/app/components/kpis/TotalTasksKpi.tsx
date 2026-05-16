"use client";

import React from "react";
import { CheckSquare } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import { DonutChart, AvailableChartColorsKeys } from "../ui/DonutChart";

interface DonutPayloadItem {
  category: string;
  value: number;
  color: string;
}

interface DonutTooltipState {
  active: boolean | undefined;
  payload: DonutPayloadItem[];
}

interface TotalTasksKpiProps {
  total: number;
  backlog: number;
  ready: number;
  inProgress: number;
  review: number;
  done: number;
}

export default function TotalTasksKpi({
  total,
  backlog,
  ready,
  inProgress,
  review,
  done,
}: TotalTasksKpiProps) {
  const [tooltipData, setTooltipData] = React.useState<DonutTooltipState | null>(null);

  const donutData = [
    { name: "Completed", value: done },
    { name: "In progress", value: inProgress },
    { name: "In review", value: review },
    { name: "Ready", value: ready },
    { name: "Backlog", value: backlog },
  ];

  const donutColors: AvailableChartColorsKeys[] = [
    "orange",
    "orangeSoft",
    "slateLight",
    "slate",
    "slateDim",
  ];

  // Mapa estatico necesario para que Tailwind no purgue las clases de color
  const dotColorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    indigo: "bg-indigo-500",
    rose: "bg-rose-500",
    cyan: "bg-cyan-500",
    orange: "bg-[var(--kpi-chart-1)]",
    orangeSoft: "bg-[var(--kpi-chart-3)]",
    orangeDeep: "bg-[var(--kpi-chart-4)]",
    slate: "bg-[var(--kpi-chart-6)]",
    slateLight: "bg-[var(--kpi-chart-2)]",
    slateDim: "bg-[var(--kpi-chart-5)]",
  };

  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0);

  const activePayload = tooltipData?.payload?.[0];
  const centerLabel = activePayload ? activePayload.category : "Total";
  const centerValue = activePayload ? activePayload.value : total;

  return (
    <KpiCard
      title="Task distribution by status"
      icon={<CheckSquare />}
      badgeType="up"
      bottomContent={
        <div className="w-full">
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="relative flex justify-center">
              <DonutChart
                data={donutData}
                category="name"
                value="value"
                colors={[...donutColors]}
                className="mx-auto h-32"
                showLabel={false}
                showTooltip={false}
                tooltipCallback={(props) => {
                  if (props.active) {
                    setTooltipData((prev) => {
                      if (
                        prev?.payload[0]?.category ===
                        props.payload?.[0]?.category
                      ) {
                        return prev;
                      }
                      return props as unknown as DonutTooltipState;
                    });
                  } else {
                    setTooltipData(null);
                  }
                  return null;
                }}
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-medium text-muted-foreground leading-tight">
                  {centerLabel}
                </span>
                <span className="text-3xl font-bold tabular-nums leading-tight">
                  {centerValue}
                </span>
                <span className="text-[11px] text-muted-foreground">tasks</span>
              </div>
            </div>

            <ul className="grid grid-cols-2 gap-2 xl:grid-cols-3">
              {donutData.map((item, i) => {
                const pct =
                  donutTotal > 0 ? Math.round((item.value / donutTotal) * 100) : 0;

                return (
                  <li key={item.name} className="rounded-md border border-border/60 bg-background/30 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${dotColorMap[donutColors[i]] ?? "bg-slate-400"}`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {item.value}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-3 border-t border-border pt-2 text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{total}</span> tasks
          </p>
        </div>
      }
    />
  );
}