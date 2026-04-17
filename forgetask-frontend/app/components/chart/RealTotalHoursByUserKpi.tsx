"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import kpiService, { type RealHoursBySprintUser } from "@/app/services/kpiService";
import { Card } from "@/app/components/ui/Card";
import type { SprintOption } from "@/app/types/sprint";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getUserSeriesColor } from "@/app/components/chart/userSeriesColor";

interface RealTotalHoursByUserKpiProps {
  selectedSprintId?: number;
  sprintOptions?: SprintOption[];
}

type SprintAxisTickProps = {
  x?: number;
  y?: number;
  width?: number;
  visibleTicksCount?: number;
  payload?: {
    value?: string;
  };
};

function formatHours(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}h`;
  }

  return `${value.toFixed(2)}h`;
}

function normalizeUserLabel(username?: string): string {
  const trimmed = username?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Unassigned";
}

function normalizeSprintDate(date?: string): string {
  return date && date.trim().length > 0 ? date : "-";
}

function toTimestampOrNaN(date?: string): number {
  if (!date || date.trim().length === 0 || date === "-") {
    return Number.NaN;
  }

  return Number(new Date(date));
}

function SprintAxisTick({ x = 0, y = 0, payload, width = 320, visibleTicksCount = 1 }: SprintAxisTickProps) {
  const rawValue = String(payload?.value ?? "");
  const [startDate = "-", sprintLabel = rawValue, endDate = "-"] = rawValue.split("||");
  const calculatedHalfRange = (width / Math.max(visibleTicksCount, 1)) * 0.45;
  const halfRange = Math.max(36, Math.min(120, calculatedHalfRange));

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-halfRange - 6} y={6} textAnchor="end" fill="#94a3b8" fontSize={10}>
        {startDate}
      </text>
      <text x={0} y={22} textAnchor="middle" fill="#cbd5e1" fontSize={12}>
        {sprintLabel}
      </text>
      <text x={halfRange + 6} y={6} textAnchor="start" fill="#94a3b8" fontSize={10}>
        {endDate}
      </text>
    </g>
  );
}

export default function RealTotalHoursByUserKpi({ selectedSprintId, sprintOptions = [] }: RealTotalHoursByUserKpiProps) {
  const [sprintUserRows, setSprintUserRows] = useState<RealHoursBySprintUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const rows = await kpiService.getRealHoursBySprintUser(
          selectedSprintId !== undefined && Number.isFinite(selectedSprintId) ? selectedSprintId : undefined,
        );
        setSprintUserRows(rows);
      } catch (error) {
        console.error("Error loading KPI data:", error);
        setErrorMessage("Could not load KPI data. Verify the backend is running on port 8080.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [selectedSprintId]);

  const filteredRows = useMemo(() => {
    if (selectedSprintId === undefined || !Number.isFinite(selectedSprintId)) {
      return sprintUserRows;
    }

    return sprintUserRows.filter((row) => Number(row.sprintId ?? 0) === selectedSprintId);
  }, [selectedSprintId, sprintUserRows]);

  const topUsers = useMemo(() => {
    const totals = new Map<string, number>();

    filteredRows.forEach((row) => {
      const user = normalizeUserLabel(row.username);
      const hoursRaw = Number(row.realTotalHours ?? 0);
      const safeHours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 0;
      totals.set(user, (totals.get(user) ?? 0) + safeHours);
    });

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name]) => name);
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const sprintDatesById = new Map<number, { startDate: string; endDate: string }>();
    sprintOptions.forEach((sprint) => {
      sprintDatesById.set(
        sprint.idSprint,
        {
          startDate: normalizeSprintDate(sprint.startDate),
          endDate: normalizeSprintDate(sprint.endDate),
        }
      );
    });

    const grouped = new Map<number, {
      sprintId: number;
      sprintNumber: number;
      sprintTitle: string;
      sprintStartDate: string;
      sprintEndDate: string;
      valuesByUser: Map<string, number>;
      totalTasks: number;
    }>();

    filteredRows.forEach((row) => {
      const sprintId = Number(row.sprintId ?? 0);
      if (!Number.isFinite(sprintId) || sprintId < 0) {
        return;
      }

      const sprintNumberRaw = Number(row.sprintNumber ?? sprintId);
      const sprintNumber = Number.isFinite(sprintNumberRaw) && sprintNumberRaw >= 0 ? sprintNumberRaw : sprintId;
      const user = normalizeUserLabel(row.username);
      const hoursRaw = Number(row.realTotalHours ?? 0);
      const safeHours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 0;
      const tasksRaw = Number(row.doneTasks ?? 0);
      const safeTasks = Number.isFinite(tasksRaw) && tasksRaw > 0 ? tasksRaw : 0;

      if (!grouped.has(sprintId)) {
        const sprintDates = sprintDatesById.get(sprintId);
        grouped.set(sprintId, {
          sprintId,
          sprintNumber,
          sprintTitle: row.sprintTitle || `Sprint ${sprintNumber}`,
          sprintStartDate: sprintDates?.startDate ?? "-",
          sprintEndDate: sprintDates?.endDate ?? "-",
          valuesByUser: new Map<string, number>(),
          totalTasks: 0,
        });
      }

      const sprint = grouped.get(sprintId)!;
      sprint.valuesByUser.set(user, (sprint.valuesByUser.get(user) ?? 0) + safeHours);
      sprint.totalTasks += safeTasks;
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        const startA = toTimestampOrNaN(a.sprintStartDate);
        const startB = toTimestampOrNaN(b.sprintStartDate);

        if (Number.isFinite(startA) && Number.isFinite(startB) && startA !== startB) {
          return startA - startB;
        }

        if (Number.isFinite(startA) && !Number.isFinite(startB)) {
          return -1;
        }

        if (!Number.isFinite(startA) && Number.isFinite(startB)) {
          return 1;
        }

        const endA = toTimestampOrNaN(a.sprintEndDate);
        const endB = toTimestampOrNaN(b.sprintEndDate);

        if (Number.isFinite(endA) && Number.isFinite(endB) && endA !== endB) {
          return endA - endB;
        }

        if (Number.isFinite(endA) && !Number.isFinite(endB)) {
          return -1;
        }

        if (!Number.isFinite(endA) && Number.isFinite(endB)) {
          return 1;
        }

        return a.sprintNumber - b.sprintNumber || a.sprintId - b.sprintId;
      })
      .map((sprint) => {
        const sprintLabel = `Sprint ${sprint.sprintNumber}`;
        const row: Record<string, number | string> = {
          sprintLabel,
          sprintAxisLabel: `${sprint.sprintStartDate}||${sprintLabel}||${sprint.sprintEndDate}`,
          sprintFullLabel: `Sprint ${sprint.sprintNumber}: ${sprint.sprintTitle}`,
          sprintStartDate: sprint.sprintStartDate,
          sprintEndDate: sprint.sprintEndDate,
          totalTasks: sprint.totalTasks,
        };

        topUsers.forEach((user) => {
          row[user] = sprint.valuesByUser.get(user) ?? 0;
        });

        return row;
      });
  }, [filteredRows, sprintOptions, topUsers]);

  const enableHorizontalScroll = chartData.length > 4;
  const chartWidth = enableHorizontalScroll ? `calc(100% * ${chartData.length} / 4)` : "100%";

  return (
    <Card className="px-5 py-4">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Actual worked hours by user · All sprints
        </span>
        <span className="text-muted-foreground opacity-60">
          <Clock3 size={20} />
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Loading KPI data...</p>
        </div>
      ) : errorMessage ? (
        <div className="space-y-3">
          <p className="kpi-error-box rounded-lg border px-3 py-2 text-sm">{errorMessage}</p>
          <button
            type="button"
            className="kpi-retry-button rounded-md border px-3 py-2 text-sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : chartData.length === 0 || topUsers.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No sprint user data available</p>
        </div>
      ) : (
        <div className="kpi-panel-muted rounded-xl border border-border p-3">
          <div className="relative">
            <div className={enableHorizontalScroll ? "overflow-x-auto pb-1" : "pb-1"}>
              <div className="relative h-[380px]" style={{ width: chartWidth, minWidth: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 30 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.24)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="sprintAxisLabel"
                      interval={0}
                      height={66}
                      tick={<SprintAxisTick />}
                    />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      cursor={{
                        fill: "transparent",
                        stroke: "rgba(147,197,253,0.85)",
                        strokeWidth: 1.2,
                      }}
                      contentStyle={{
                        background: "rgba(8,16,32,0.96)",
                        border: "1px solid rgba(148,163,184,0.35)",
                        borderRadius: "10px",
                        color: "#e2e8f0",
                      }}
                      formatter={(value: number | string, name: string | number) => {
                        const numeric = Number(value);
                        return [formatHours(Number.isFinite(numeric) ? numeric : 0), String(name)];
                      }}
                      labelFormatter={(label: string, payload) => {
                        const source = payload?.[0]?.payload as {
                          sprintLabel?: string;
                        } | undefined;
                        if (!source?.sprintLabel) {
                          return label;
                        }

                        return source.sprintLabel;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: "#f8fafc", fontSize: "12px" }}
                      formatter={(value) => <span className="text-foreground">{String(value)}</span>}
                    />
                    {topUsers.map((user) => (
                      <Bar
                        key={user}
                        dataKey={user}
                        name={user}
                        fill={getUserSeriesColor(user)}
                        radius={[5, 5, 0, 0]}
                        maxBarSize={28}
                      >
                        <LabelList
                          dataKey={user}
                          position="top"
                          fill="#dbeafe"
                          fontSize={10}
                          formatter={(value: number | string) => {
                            const numeric = Number(value);
                            if (!Number.isFinite(numeric)) {
                              return "";
                            }

                            return Number.isInteger(numeric) ? numeric : numeric.toFixed(1);
                          }}
                        />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md border border-border/60 bg-background/55 px-2 py-1 text-[10px] leading-tight text-muted-foreground">
              <p>X axis: Sprint range</p>
              <p>Y axis: Real worked hours</p>
            </div>
          </div>

        </div>
      )}
    </Card>
  );
}
