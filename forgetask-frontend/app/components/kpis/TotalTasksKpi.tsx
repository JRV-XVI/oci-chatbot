"use client";

import React from "react";
import { CheckSquare } from "lucide-react";
import { TooltipProps } from "recharts";
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

const LEGEND_META = [
  { key: "Done",        dot: "bg-orange-500"     },
  { key: "In Progress", dot: "bg-orange-300"     },
  { key: "Review",      dot: "bg-slate-400"      },
  { key: "Ready",       dot: "bg-slate-500"      },
  { key: "Backlog",     dot: "bg-slate-600"      },
] as const;

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

  const DONUT_COLORS: AvailableChartColorsKeys[] = ["orange", "orangeSoft", "slateLight", "slate", "slateDim"];

  const activePayload = tooltipData?.payload?.[0];
  const centerLabel = activePayload ? activePayload.category : "Total";
  const centerValue = activePayload ? activePayload.value : total;

  return (
    <KpiCard
      title="Total de Tareas"
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
              colors={DONUT_COLORS}
              className="h-56 w-full"
              tooltipCallback={(props: TooltipProps) => {
                if (props.active) {
                  setTooltipData((prev) => {
                    const tooltipState: DonutTooltipState = {
                      active: props.active,
                      payload: (props as any).payload as DonutPayloadItem[],
                    };
                    if (prev?.payload[0]?.category === tooltipState.payload[0]?.category)
                      return prev;
                    return tooltipState;
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

          <p className="text-sm text-muted-foreground border-t border-border w-full pt-3 text-center">
            Total: <span className="font-semibold text-foreground">{total}</span> tareas
          </p>
        </div>
      }
    />
  );
}