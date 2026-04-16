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
    { name: "Done",        value: done        },
    { name: "In Progress", value: inProgress  },
    { name: "Review",      value: review      },
    { name: "Ready",       value: ready       },
    { name: "Backlog",     value: backlog     },
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
    orange: "bg-[#e76b36]",
    orangeSoft: "bg-[#f19367]",
    orangeDeep: "bg-[#c45223]",
    slate: "bg-[#2b3542]",
    slateLight: "bg-[#6e7d91]",
    slateDim: "bg-[#1f2937]",
  };

  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0);

  const activePayload = tooltipData?.payload?.[0];
  const centerLabel = activePayload ? activePayload.category : "Total";
  const centerValue = activePayload ? activePayload.value : total;

  return (
    <KpiCard
      title="Tareas totales en el proyecto"
      icon={<CheckSquare />}
      badgeType="up"
      bottomContent={
        <div className="flex flex-col items-center gap-5 w-full">

          {/* Donut + label central absoluto */}
          <div className="relative w-full flex justify-center">
            <DonutChart
              data={donutData}
              category="name"
              value="value"
              colors={[...donutColors]}
              className="mx-auto h-28"
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
              <span className="text-sm font-medium text-muted-foreground leading-tight">
                {centerLabel}
              </span>
              <span className="text-4xl font-bold tabular-nums leading-tight">
                {centerValue}
              </span>
              <span className="text-xs text-muted-foreground">tareas</span>
            </div>
          </div>

          {/* ── Leyenda debajo del chart ── */}
          <ul className="mt-3 w-full space-y-1.5">
            {donutData.map((item, i) => {
              const pct =
                donutTotal > 0 ? Math.round((item.value / donutTotal) * 100) : 0;

              return (
                <li
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${dotColorMap[donutColors[i]] ?? "bg-slate-400"}`}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground tabular-nums">
                      {item.value}
                    </span>
                    <span className="w-9 text-right text-muted-foreground tabular-nums">
                      {pct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-sm text-muted-foreground border-t border-border w-full pt-3 text-center">
            Total: <span className="font-semibold text-foreground">{total}</span> tareas
          </p>
        </div>
      }
    />
  );
}