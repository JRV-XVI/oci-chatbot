import { CheckSquare } from "lucide-react";
import KpiCard from "../ui/kpiCard";
import React from "react";
import { DonutChart } from "../ui/DonutChart";

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

export default function TotalTasksKpi({ total, backlog, ready, inProgress, review, done }: TotalTasksKpiProps) {

  const [tooltipData, setTooltipData] = React.useState<DonutTooltipState | null>(null);

  const donutData = [
    { name: "Done",        value: done },
    { name: "In Progress", value: inProgress },
    { name: "Review",      value: review },
    { name: "Ready",       value: ready },
    { name: "Backlog",     value: backlog },
  ];

  const donutColors = ["orange", "orangeSoft", "slateLight", "slate", "slateDim"] as const;

  const activePayload = tooltipData?.payload?.[0];
  const centerLabel   = activePayload ? activePayload.category : "Total";
  const centerValue   = activePayload ? activePayload.value    : total;

  return (
    <KpiCard
      title="Tareas totales"
      value={total}
      suffix="tareas"
      icon={<CheckSquare size={18} />}
      badgeType="up"
      // Le pasamos el donut como bottomContent para tener control total del layout
      bottomContent={
        <div>
          {/* DonutChart interactivo con tooltipCallback */}
          <DonutChart
            data={donutData}
            category="name"
            value="value"
            colors={[...donutColors]}
            className="mx-auto mt-0 h-14"
            showLabel={false}
            showTooltip={true}
            tooltipCallback={(props) => {
              if (props.active) {
                setTooltipData((prev) => {
                  // Evita re-renders innecesarios si ya es la misma categoría
                  if (prev?.payload[0]?.category === props.payload[0]?.category)
                    return prev;
                  return props;
                });
              } else {
                setTooltipData(null);
              }
              return null;
            }}
          />
        </div>
      }
    />
  );
}