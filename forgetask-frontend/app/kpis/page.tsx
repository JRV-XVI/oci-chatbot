"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProjectHeader } from "@/app/components/kanban/project-header";
import { AppLayout } from "@/app/components/layout/app-layout";
import TotalTasksKpi from "../components/kpis/TotalTasksKpi";
import TotalHoursKpi from "../components/kpis/TotalHoursKpi";
import AvgTasksKpi from "../components/kpis/AvgTasksKpi";
import AvgHoursDevKpi from "../components/kpis/AvgHoursDevKpi";
import UserTasksCompletionKpi from "../components/kpis/UserTasksCompletionKpi";
import RealTotalHoursByUserKpi from "@/app/components/chart/RealTotalHoursByUserKpi";
import { KpiFilterBar, type KpiFilters } from "../components/kpis/KpiFilterBar";
import sprintService from "../services/sprintService";
import projectService from "../services/projectService";
import type { SprintOption } from "../types/sprint";

import metricsService, {
  type SprintUserPerformance,
} from "../services/metricsService";

import kpiService, {
  type ProjectKpisSummary,
  type RealHoursByUser,
} from "../services/kpiService";

interface SprintTasksByUser {
  sprintId: number;
  sprintNumber: number;
  sprintTitle: string;
  startDate?: string;
  endDate?: string;
  users: SprintUserPerformance[];
}

// ── mediana client-side ───────────────────────────────────────
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
    : sorted[mid];
}

function KpisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tasksBySprint, setTasksBySprint] = useState<SprintTasksByUser[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>("Project KPIs");
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KPIs base (sin filtro) — para las 4 cards en modo "All"
  const [kpis, setKpis] = useState<ProjectKpisSummary | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  // KPIs filtrados por sprint (re-fetch al backend)
  const [filteredKpis, setFilteredKpis] = useState<ProjectKpisSummary | null>(null);
  const [filteredKpisLoading, setFilteredKpisLoading] = useState(false);

  // Filas por usuario para filtro dev + mediana
  const [perUserRows, setPerUserRows] = useState<RealHoursByUser[]>([]);

  // Filtros activos
  const [filters, setFilters] = useState<KpiFilters>({ sprintId: undefined, username: undefined });

  const usersCardTitle = "Tasks completed by user · All sprints";

  // ── 1. Inicialización ──────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setKpisLoading(true);
        setSprintsLoading(true);

        const projectIdParam = searchParams.get("projectId");
        const parsedProjectId = projectIdParam !== null ? Number(projectIdParam) : NaN;
        const validFromQuery = Number.isFinite(parsedProjectId) ? parsedProjectId : undefined;

        const projects = await projectService.listProjects();
        const fallback = projects.length > 0 ? projects[0].idProject : 1;
        const resolvedId = validFromQuery ?? fallback;
        setProjectId(resolvedId);

        const resolvedProject = projects.find((p) => p.idProject === resolvedId);
        setProjectTitle(resolvedProject?.title || "Project KPIs");

        const [kpisData, projectSprints] = await Promise.all([
          kpiService.getProjectKpisSummary(resolvedId),
          sprintService.listSprints(resolvedId),
        ]);

        setKpis(kpisData);
        setFilteredKpis(kpisData);

        const sorted = [...projectSprints].sort((a, b) => a.sprintNumber - b.sprintNumber);
        setSprints(sorted);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize KPI data");
      } finally {
        setSprintsLoading(false);
        setKpisLoading(false);
      }
    };
    void init();
  }, [searchParams]);

  // ── 2. Re-fetch al cambiar sprint ─────────────────────────
  useEffect(() => {
    if (projectId === null) return;
    const refetch = async () => {
      try {
        setFilteredKpisLoading(true);
        const data = await kpiService.getProjectKpisSummary(projectId, filters.sprintId);
        setFilteredKpis(data);
      } catch (err) {
        console.error("Error fetching filtered KPIs:", err);
      } finally {
        setFilteredKpisLoading(false);
      }
    };
    void refetch();
  }, [projectId, filters.sprintId]);

  // ── 3. Filas por usuario al cambiar sprint ────────────────
  useEffect(() => {
    if (projectId === null) return;
    const fetch = async () => {
      try {
        const rows = await kpiService.getRealHoursByUser(filters.sprintId);
        setPerUserRows(rows);
      } catch (err) {
        console.error("Error fetching per-user rows:", err);
      }
    };
    void fetch();
  }, [projectId, filters.sprintId]);

  // ── 4. Tasks por sprint para UserTasksCompletionKpi ───────
  useEffect(() => {
    const fetchUsers = async () => {
      if (projectId === null || sprintsLoading) return;
      if (sprints.length === 0) { setTasksBySprint([]); setLoading(false); return; }
      try {
        setLoading(true);
        const sprintMetrics = await Promise.all(
          sprints.map((s) => metricsService.getTasksDoneByUserInSprint(s.idSprint))
        );
        setTasksBySprint(sprints.map((sprint, i) => ({
          sprintId: sprint.idSprint,
          sprintNumber: sprint.sprintNumber,
          sprintTitle: sprint.title,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          users: sprintMetrics[i] ?? [],
        })));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user tasks data");
      } finally {
        setLoading(false);
      }
    };
    void fetchUsers();
  }, [projectId, sprints, sprintsLoading]);

  // ── KPIs efectivos según filtros ─────────────────────────
  // Si hay dev seleccionado → calculamos desde perUserRows (client-side)
  // Si hay sprint → usamos filteredKpis del backend
  // Si nada → kpis globales
  const effectiveKpis = useMemo(() => {
    const base = filteredKpis;
    if (!base) return null;

    if (filters.username) {
      const row = perUserRows.find((r) => r.username === filters.username);
      if (!row) return null;
      return {
        ...base,
        tasksDone: row.doneTasks,
        realHours: row.realTotalHours,
        totalTasks: row.doneTasks,
        tasksBacklog: 0,
        tasksReady: 0,
        tasksInProgress: 0,
        tasksReview: 0,
        avgTasksPerDev: row.doneTasks,
        avgHoursPerDev: row.realTotalHours,
        totalDevs: 1,
        estimatedHours: base.estimatedHours,
      };
    }

    return base;
  }, [filteredKpis, filters.username, perUserRows]);

  // Mediana calculada client-side desde perUserRows
  const medianTasks = useMemo(() => median(perUserRows.map((r) => r.doneTasks)), [perUserRows]);
  const medianHours = useMemo(() => median(perUserRows.map((r) => r.realTotalHours)), [perUserRows]);

  const handleFiltersChange = useCallback((f: KpiFilters) => {
    setFilters(f);
  }, []);

  const handleBackToKanban = useCallback(() => router.push("/"), [router]);

  const isFiltered = filters.sprintId !== undefined || filters.username !== undefined;
  const isLoading = kpisLoading || filteredKpisLoading;

  const headerContent = (
    <ProjectHeader
      projectTitle={projectTitle}
      buttonsConfig={{
        addSprint: {
          show: true,
          projectId,
          sprintOptions: sprints,
          onSprintSaved: () => {},
          onSprintDeleted: () => {},
        },
        custom: [
          {
            label: "Kanban Board",
            icon: ArrowLeft,
            onClick: handleBackToKanban,
            variant: "outline",
            testId: "btn-back-to-kanban",
          },
        ],
      }}
      sectionsConfig={{ progress: { show: false } }}
      showSidebarToggle={true}
      onSidebarToggle={() => {}}
    />
  );

  const mainContent = (
    <main className="flex-1 min-h-0 overflow-y-auto app-background px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-[1680px] space-y-6">

        {/* ── Key indicators ── */}
        <section className="kpi-section-enter">
          <div className="w-full rounded-2xl border border-border bg-card/60 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.2)] md:p-6">

            {/* encabezado + filtros */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Key indicators
              </h2>
              <KpiFilterBar
                sprints={sprints}
                perUserRows={perUserRows}
                filters={filters}
                onChange={handleFiltersChange}
              />
            </div>

            {/* 4 cards */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : effectiveKpis ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TotalTasksKpi
                  total={effectiveKpis.totalTasks}
                  backlog={effectiveKpis.tasksBacklog}
                  ready={effectiveKpis.tasksReady}
                  inProgress={effectiveKpis.tasksInProgress}
                  review={effectiveKpis.tasksReview}
                  done={effectiveKpis.tasksDone}
                />
                <TotalHoursKpi
                  realHours={effectiveKpis.realHours}
                  estimatedHours={effectiveKpis.estimatedHours}
                />
                <AvgTasksKpi
                  totalTasks={effectiveKpis.totalTasks}
                  totalDevs={effectiveKpis.totalDevs}
                  medianTasksPerDev={medianTasks}
                />
                <AvgHoursDevKpi
                  totalHours={effectiveKpis.realHours}
                  totalDevs={effectiveKpis.totalDevs}
                  expectedHoursPerDev={effectiveKpis.expectedHoursPerDev}
                  medianHoursPerDev={medianHours}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                No KPI data available for this project.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <section className="kpi-section-enter">
            {error ? (
              <div className="kpi-error-box rounded-lg border p-4">Error loading data: {error}</div>
            ) : loading ? (
              <div className="kpi-panel rounded-lg border border-border p-4 text-muted-foreground">
                Loading user task data...
              </div>
            ) : (
              <UserTasksCompletionKpi sprintData={tasksBySprint} title={usersCardTitle} />
            )}
          </section>

          <section className="kpi-section-enter">
            <RealTotalHoursByUserKpi sprintOptions={sprints} taskSprintData={tasksBySprint} />
          </section>
        </section>
      </div>
    </main>
  );

  return (
    <AppLayout onMembersClick={() => {}}>
      <div className="h-full min-h-0 flex flex-col">
        {headerContent}
        {mainContent}
      </div>
    </AppLayout>
  );
}

// ── mini stat pill inline ─────────────────────────────────────
function StatPill({
  label,
  value,
  suffix,
  decimals = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <span className="flex items-baseline gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">
        {value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {suffix && <span className="text-muted-foreground font-normal ml-0.5">{suffix}</span>}
      </span>
    </span>
  );
}

export default function KPIsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center p-6 text-sm text-muted-foreground">
          Loading KPI page...
        </div>
      }
    >
      <KpisContent />
    </Suspense>
  );
}