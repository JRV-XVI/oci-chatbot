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
  taskSprintData?: Array<{
    sprintId: number;
    users: Array<{
      doneCount?: number | null;
    }>;
  }>;
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

function normalizeUserLabel(displayName?: string): string {
  const trimmed = displayName?.trim();
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

function buildSprintLabel(sprintNumber: number, sprintTitle?: string): string {
  const fallback = `Sprint ${sprintNumber}`;
  const trimmedTitle = sprintTitle?.trim() ?? "";

  if (trimmedTitle.length === 0) {
    return fallback;
  }

  const repeatedPrefix = new RegExp(`^sprint\\s*${sprintNumber}\\s*[-:|·]?\\s*`, "i");
  const cleanedTitle = trimmedTitle.replace(repeatedPrefix, "").trim();

  if (cleanedTitle.length === 0) {
    return fallback;
  }

  return `${fallback} · ${cleanedTitle}`;
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

export default function RealTotalHoursByUserKpi({
  selectedSprintId,
  sprintOptions = [],
  taskSprintData = [],
}: RealTotalHoursByUserKpiProps) {
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

  const taskTotalsBySprint = useMemo(() => {
    const totals = new Map<number, number>();

    taskSprintData.forEach((sprint) => {
      const sprintId = Number(sprint.sprintId ?? 0);
      if (!Number.isFinite(sprintId) || sprintId < 0) {
        return;
      }

      const totalDoneTasks = sprint.users.reduce((sum, row) => {
        const done = Number(row.doneCount ?? 0);
        return sum + (Number.isFinite(done) && done > 0 ? done : 0);
      }, 0);

      totals.set(sprintId, totalDoneTasks);
    });

    return totals;
  }, [taskSprintData]);

  const topUsers = useMemo(() => {
    const taskTotals = new Map<string, number>();
    const hourTotals = new Map<string, number>();

    filteredRows.forEach((row) => {
      const user = normalizeUserLabel(row.displayName);
      const tasksRaw = Number(row.doneTasks ?? 0);
      const safeTasks = Number.isFinite(tasksRaw) && tasksRaw > 0 ? tasksRaw : 0;
      const hoursRaw = Number(row.realTotalHours ?? 0);
      const safeHours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 0;

      if (safeTasks > 0) {
        taskTotals.set(user, (taskTotals.get(user) ?? 0) + safeTasks);
      }

      hourTotals.set(user, (hourTotals.get(user) ?? 0) + safeHours);
    });

    return Array.from(hourTotals.keys())
      .sort((a, b) => {
        const tasksDiff = (taskTotals.get(b) ?? 0) - (taskTotals.get(a) ?? 0);
        if (tasksDiff !== 0) {
          return tasksDiff;
        }

        const hoursDiff = (hourTotals.get(b) ?? 0) - (hourTotals.get(a) ?? 0);
        if (hoursDiff !== 0) {
          return hoursDiff;
        }

        return a.localeCompare(b);
      })
      .slice(0, 5)
      .map((name) => name);
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const sprintMetaById = new Map<number, { sprintNumber: number; title: string; startDate: string; endDate: string }>();
    sprintOptions.forEach((sprint) => {
      sprintMetaById.set(
        sprint.idSprint,
        {
          sprintNumber: sprint.sprintNumber,
          title: sprint.title,
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

    // Seed sprints from task KPI data so chart 2 follows task-based sprint visibility.
    taskSprintData.forEach((taskSprint) => {
      const sprintId = Number(taskSprint.sprintId ?? 0);
      if (!Number.isFinite(sprintId) || sprintId < 0) {
        return;
      }

      const taskTotal = taskTotalsBySprint.get(sprintId) ?? 0;
      if (taskTotal <= 0 || grouped.has(sprintId)) {
        return;
      }

      const sprintMeta = sprintMetaById.get(sprintId);
      const sprintNumberRaw = Number(sprintMeta?.sprintNumber ?? sprintId);
      const sprintNumber = Number.isFinite(sprintNumberRaw) && sprintNumberRaw >= 0 ? sprintNumberRaw : sprintId;

      grouped.set(sprintId, {
        sprintId,
        sprintNumber,
        sprintTitle: sprintMeta?.title || `Sprint ${sprintNumber}`,
        sprintStartDate: sprintMeta?.startDate ?? "-",
        sprintEndDate: sprintMeta?.endDate ?? "-",
        valuesByUser: new Map<string, number>(),
        totalTasks: 0,
      });
    });

    filteredRows.forEach((row) => {
      const sprintId = Number(row.sprintId ?? 0);
      if (!Number.isFinite(sprintId) || sprintId < 0) {
        return;
      }

      const sprintMeta = sprintMetaById.get(sprintId);
      const sprintNumberRaw = Number(sprintMeta?.sprintNumber ?? row.sprintNumber ?? sprintId);
      const sprintNumber = Number.isFinite(sprintNumberRaw) && sprintNumberRaw >= 0 ? sprintNumberRaw : sprintId;
      const user = normalizeUserLabel(row.displayName);
      const hoursRaw = Number(row.realTotalHours ?? 0);
      const safeHours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 0;
      const tasksRaw = Number(row.doneTasks ?? 0);
      const safeTasks = Number.isFinite(tasksRaw) && tasksRaw > 0 ? tasksRaw : 0;

      if (!grouped.has(sprintId)) {
        grouped.set(sprintId, {
          sprintId,
          sprintNumber,
          sprintTitle: sprintMeta?.title || row.sprintTitle || `Sprint ${sprintNumber}`,
          sprintStartDate: sprintMeta?.startDate ?? "-",
          sprintEndDate: sprintMeta?.endDate ?? "-",
          valuesByUser: new Map<string, number>(),
          totalTasks: 0,
        });
      }

      const sprint = grouped.get(sprintId)!;
      sprint.valuesByUser.set(user, (sprint.valuesByUser.get(user) ?? 0) + safeHours);
      sprint.totalTasks += safeTasks;
    });

    return Array.from(grouped.values())
      .filter((sprint) => (taskTotalsBySprint.get(sprint.sprintId) ?? sprint.totalTasks) > 0)
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
        const sprintLabel = buildSprintLabel(sprint.sprintNumber, sprint.sprintTitle);
        const row: Record<string, number | string> = {
          sprintLabel,
          sprintAxisLabel: `${sprint.sprintStartDate}||${sprintLabel}||${sprint.sprintEndDate}`,
          sprintFullLabel: sprintLabel,
          sprintStartDate: sprint.sprintStartDate,
          sprintEndDate: sprint.sprintEndDate,
          totalTasks: sprint.totalTasks,
        };

        topUsers.forEach((user) => {
          row[user] = sprint.valuesByUser.get(user) ?? 0;
        });

        return row;
      });
  }, [filteredRows, sprintOptions, taskSprintData, taskTotalsBySprint, topUsers]);

  const visibleSprintSlots = 3;
  const enableHorizontalScroll = chartData.length > visibleSprintSlots;
  const chartWidth = enableHorizontalScroll ? `calc(100% * ${chartData.length} / ${visibleSprintSlots})` : "100%";

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
                      formatter={(value, name) => {
                        const numeric = Number(value ?? 0);
                        return [formatHours(Number.isFinite(numeric) ? numeric : 0), String(name ?? "")];
                      }}
                      labelFormatter={(label, payload) => {
                        const source = payload?.[0]?.payload as {
                          sprintLabel?: string;
                          sprintFullLabel?: string;
                        } | undefined;
                        if (!source?.sprintLabel && !source?.sprintFullLabel) {
                          return label;
                        }

                        return source.sprintFullLabel ?? source.sprintLabel;
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
                          formatter={(value) => {
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
