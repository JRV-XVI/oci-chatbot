"use client";

/**
 * KpiAnalysisBar
 * ─────────────────────────────────────────────────────────
 * Barra de estadísticas rápidas (6 números) con dos selectores:
 *   • Filtro 1 — Sprint (llama al backend para recalcular)
 *   • Filtro 2 — Dev    (filtra client-side desde perUserRows)
 *
 * Recibe los datos ya cargados desde kpis/page.tsx para no
 * duplicar fetches. Emite hacia arriba cuando cambia el filtro.
 */

import React from "react";
import { BarChart2, ChevronDown, User, Layers } from "lucide-react";
import { NumberTicker } from "@/app/components/ui/NumberTicker";
import type { SprintOption } from "@/app/types/sprint";
import type { RealHoursByUser } from "@/app/services/kpiService";

// ─── tipos ────────────────────────────────────────────────

export interface AnalysisSummary {
  completedTasks: number;
  totalRealHours: number;
  avgTaskPerDev: number;
  avgHoursPerDev: number;
  medianTaskPerDev: number;
  medianHoursPerDev: number;
}

interface KpiAnalysisBarProps {
  /** Summary calculado (project-wide o sprint-filtered desde el backend) */
  summary: AnalysisSummary | null;
  loading: boolean;

  /** Sprints disponibles para el selector */
  sprints: SprintOption[];

  /** Filas por usuario para el filtro dev (client-side) */
  perUserRows: RealHoursByUser[];

  /** Filtro activo de sprint (undefined = All Sprints) */
  selectedSprintId: number | undefined;
  onSprintChange: (sprintId: number | undefined) => void;

  /** Filtro activo de dev (undefined = All Devs) */
  selectedUsername: string | undefined;
  onDevChange: (username: string | undefined) => void;
}

// ─── componente select reutilizable ───────────────────────

interface FilterSelectProps {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  label: string;
}

function FilterSelect({ icon, value, onChange, children, label }: FilterSelectProps) {
  const selectId = `filter-select-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="relative flex items-center">
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <span className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
        {icon}
      </span>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "h-9 pl-9 pr-8 rounded-lg border border-border bg-card",
          "text-sm text-foreground appearance-none outline-none cursor-pointer",
          "transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "min-w-[150px]",
        ].join(" ")}
      >
        {children}
      </select>
      <span className="absolute right-2.5 text-muted-foreground pointer-events-none">
        <ChevronDown size={14} />
      </span>
    </div>
  );
}


// ─── mini-stat ────────────────────────────────────────────

interface StatCellProps {
  label: string;
  value: number | null;
  decimals?: number;
  suffix?: string;
  loading?: boolean;
  highlight?: boolean;
}

function StatCell({ label, value, decimals = 0, suffix, loading, highlight }: StatCellProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 min-w-[100px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      {loading || value === null ? (
        <span className="h-8 w-16 rounded bg-muted animate-pulse" />
      ) : (
        <div className="flex items-end gap-1">
          <NumberTicker
            value={value}
            decimalPlaces={decimals}
            className={[
              "text-2xl font-bold tabular-nums leading-none",
              highlight ? "text-[var(--kpi-chart-1)]" : "text-foreground",
            ].join(" ")}
          />
          {suffix && (
            <span className="text-sm text-muted-foreground font-medium mb-0.5 leading-none">
              {suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── utilidades de mediana (client-side) ──────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
    : sorted[mid];
}

// ─── componente principal ─────────────────────────────────

export default function KpiAnalysisBar({
  summary,
  loading,
  sprints,
  perUserRows,
  selectedSprintId,
  onSprintChange,
  selectedUsername,
  onDevChange,
}: KpiAnalysisBarProps) {

  // ── Calcular stats efectivos ───────────────────────────
  // Si hay un dev seleccionado, sobreescribimos client-side.
  const effectiveStats = React.useMemo<AnalysisSummary | null>(() => {
    if (!summary) return null;

    if (selectedUsername) {
      const row = perUserRows.find((r) => r.username === selectedUsername);
      if (!row) return null;
      return {
        completedTasks: row.doneTasks,
        totalRealHours: row.realTotalHours,
        // avg/median no aplican para un solo dev → mostramos su valor individual
        avgTaskPerDev: row.doneTasks,
        avgHoursPerDev: row.realTotalHours,
        medianTaskPerDev: row.doneTasks,
        medianHoursPerDev: row.realTotalHours,
      };
    }

    // Si no hay filtro de dev, calculamos mediana client-side desde perUserRows
    // (el backend no la provee todavía).
    const taskValues  = perUserRows.map((r) => r.doneTasks);
    const hoursValues = perUserRows.map((r) => r.realTotalHours);

    return {
      ...summary,
      medianTaskPerDev:  perUserRows.length > 0 ? median(taskValues)  : summary.medianTaskPerDev,
      medianHoursPerDev: perUserRows.length > 0 ? median(hoursValues) : summary.medianHoursPerDev,
    };
  }, [summary, selectedUsername, perUserRows]);

  const isSingleDev = !!selectedUsername;

  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 shadow-[0_18px_45px_rgba(0,0,0,0.2)] overflow-hidden">

      {/* ── Encabezado + filtros ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border/60 bg-card/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart2 size={16} />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
            Task &amp; Hour Analysis
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ── Filtro 1: Sprint ── */}
          <FilterSelect
            label="Filter by sprint"
            icon={<Layers size={14} />}
            value={selectedSprintId !== undefined ? String(selectedSprintId) : "all"}
            onChange={(v) => onSprintChange(v === "all" ? undefined : Number(v))}
          >
            <option value="all">All Sprints</option>
            {sprints.map((s) => (
              <option key={s.idSprint} value={String(s.idSprint)}>
                {s.title}
              </option>
            ))}
          </FilterSelect>

          {/* ── Filtro 2: Dev ── */}
          <FilterSelect
            label="Filter by developer"
            icon={<User size={14} />}
            value={selectedUsername ?? "all"}
            onChange={(v) => onDevChange(v === "all" ? undefined : v)}
          >
            <option value="all">All Devs</option>
            {perUserRows.map((r) => (
              <option key={r.username} value={r.username}>
                {r.displayName}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="flex flex-wrap divide-x divide-border/50">
        <StatCell
          label="Completed Tasks"
          value={effectiveStats?.completedTasks ?? null}
          loading={loading}
          highlight
        />
        <StatCell
          label="Total Real Hours"
          value={effectiveStats?.totalRealHours ?? null}
          loading={loading}
          suffix="h"
        />

        {/* separador visual entre totales y promedios */}
        <div className="hidden md:block w-px self-stretch bg-border/30 mx-1" />

        <StatCell
          label={isSingleDev ? "Tasks (dev)" : "Avg Task/Dev"}
          value={effectiveStats?.avgTaskPerDev ?? null}
          decimals={1}
          loading={loading}
        />
        <StatCell
          label={isSingleDev ? "Hours (dev)" : "Avg Hours/Dev"}
          value={effectiveStats?.avgHoursPerDev ?? null}
          decimals={1}
          suffix="h"
          loading={loading}
        />

        {/* medianas — se ocultan cuando hay un dev específico (no aportan) */}
        {!isSingleDev && (
          <>
            <StatCell
              label="Median Task/Dev"
              value={effectiveStats?.medianTaskPerDev ?? null}
              decimals={1}
              loading={loading}
            />
            <StatCell
              label="Median Hours/Dev"
              value={effectiveStats?.medianHoursPerDev ?? null}
              decimals={1}
              suffix="h"
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
}