"use client"

import { useMemo } from "react"
import { Users } from "lucide-react"
import { Card } from "./Card"
import type { SprintUserPerformance } from "@/app/services/metricsService"
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
} from "recharts"
import { getUserSeriesColor } from "@/app/components/chart/userSeriesColor"

interface SprintTasksByUser {
  sprintId: number
  sprintNumber: number
  sprintTitle: string
  startDate?: string
  endDate?: string
  users: SprintUserPerformance[]
}

interface UserTasksCompletionCardProps {
  sprintData: SprintTasksByUser[]
  title?: string
  icon?: React.ReactNode
}

type SprintAxisTickProps = {
  x?: number
  y?: number
  width?: number
  visibleTicksCount?: number
  payload?: {
    value?: string
  }
}

function normalizeUserLabel(name?: string): string {
  const trimmed = name?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : "Unassigned"
}

function normalizeSprintDate(date?: string): string {
  return date && date.trim().length > 0 ? date : "-"
}

function toTimestampOrNaN(date?: string): number {
  if (!date || date.trim().length === 0 || date === "-") {
    return Number.NaN
  }

  return Number(new Date(date))
}

function compareSprintsByDates(
  a: Pick<SprintTasksByUser, "startDate" | "endDate" | "sprintNumber" | "sprintId">,
  b: Pick<SprintTasksByUser, "startDate" | "endDate" | "sprintNumber" | "sprintId">,
): number {
  const startA = toTimestampOrNaN(a.startDate)
  const startB = toTimestampOrNaN(b.startDate)

  if (Number.isFinite(startA) && Number.isFinite(startB) && startA !== startB) {
    return startA - startB
  }

  if (Number.isFinite(startA) && !Number.isFinite(startB)) {
    return -1
  }

  if (!Number.isFinite(startA) && Number.isFinite(startB)) {
    return 1
  }

  const endA = toTimestampOrNaN(a.endDate)
  const endB = toTimestampOrNaN(b.endDate)

  if (Number.isFinite(endA) && Number.isFinite(endB) && endA !== endB) {
    return endA - endB
  }

  if (Number.isFinite(endA) && !Number.isFinite(endB)) {
    return -1
  }

  if (!Number.isFinite(endA) && Number.isFinite(endB)) {
    return 1
  }

  return a.sprintNumber - b.sprintNumber || a.sprintId - b.sprintId
}

function SprintAxisTick({ x = 0, y = 0, payload, width = 320, visibleTicksCount = 1 }: SprintAxisTickProps) {
  const rawValue = String(payload?.value ?? "")
  const [startDate = "-", sprintLabel = rawValue, endDate = "-"] = rawValue.split("||")
  const calculatedHalfRange = (width / Math.max(visibleTicksCount, 1)) * 0.45
  const halfRange = Math.max(36, Math.min(120, calculatedHalfRange))

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
  )
}

export default function UserTasksCompletionCard({
  sprintData,
  title = "Tasks completed by user",
  icon = <Users size={20} />,
}: UserTasksCompletionCardProps) {
  const visibleSprintData = useMemo(() => {
    return sprintData.filter((sprint) => {
      const sprintDoneTotal = sprint.users.reduce((sum, row) => {
        const done = Number(row.doneCount ?? 0)
        return sum + (Number.isFinite(done) && done > 0 ? done : 0)
      }, 0)

      return sprintDoneTotal > 0
    })
  }, [sprintData])

  const topUsers = useMemo(() => {
    const totals = new Map<string, number>()

    visibleSprintData.forEach((sprint) => {
      sprint.users.forEach((row) => {
        const user = normalizeUserLabel(row.username || row.displayName)
        const done = Number(row.doneCount ?? 0)
        const safeDone = Number.isFinite(done) && done > 0 ? done : 0
        totals.set(user, (totals.get(user) ?? 0) + safeDone)
      })
    })

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name]) => name)
  }, [visibleSprintData])

  const chartData = useMemo(() => {
    return visibleSprintData
      .slice()
      .sort(compareSprintsByDates)
      .map((sprint) => {
        const sprintLabel = `Sprint ${sprint.sprintNumber}`
        const sprintStartDate = normalizeSprintDate(sprint.startDate)
        const sprintEndDate = normalizeSprintDate(sprint.endDate)
        const row: Record<string, number | string> = {
          sprintLabel,
          sprintAxisLabel: `${sprintStartDate}||${sprintLabel}||${sprintEndDate}`,
          sprintFullLabel: `Sprint ${sprint.sprintNumber}: ${sprint.sprintTitle}`,
          sprintStartDate,
          sprintEndDate,
        }

        topUsers.forEach((user) => {
          const sprintUser = sprint.users.find(
            (entry) => normalizeUserLabel(entry.username || entry.displayName) === user,
          )
          row[user] = sprintUser ? Number(sprintUser.doneCount ?? 0) : 0
        })

        return row
      })
  }, [topUsers, visibleSprintData])

  const enableHorizontalScroll = chartData.length > 4
  const chartWidth = enableHorizontalScroll ? `calc(100% * ${chartData.length} / 4)` : "100%"

  return (
    <Card className="px-5 py-4">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {icon ? <span className="text-muted-foreground opacity-60">{icon}</span> : null}
      </div>

      {chartData.length === 0 || topUsers.length === 0 ? (
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
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} allowDecimals={false} />
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
                      formatter={(value: number | string, name: string | number) => [
                        Number.isFinite(Number(value)) ? Number(value) : 0,
                        String(name),
                      ]}
                      labelFormatter={(label: string, payload) => {
                        const source = payload?.[0]?.payload as {
                          sprintLabel?: string
                        } | undefined
                        if (!source?.sprintLabel) {
                          return label
                        }

                        return source.sprintLabel
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
                            const numeric = Number(value)
                            return Number.isFinite(numeric) ? numeric : ""
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
              <p>Y axis: Completed tasks</p>
            </div>
          </div>

        </div>
      )}
    </Card>
  )
}
