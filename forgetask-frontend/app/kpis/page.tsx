"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
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
import sprintService from "../services/sprintService";
import projectService from "../services/projectService";
import type { SprintOption } from "../types/sprint";

import metricsService, {
  type SprintUserPerformance,
} from "../services/metricsService";

import kpiService, { ProjectKpisSummary } from "../services/kpiService";

interface SprintTasksByUser {
  sprintId: number;
  sprintNumber: number;
  sprintTitle: string;
  startDate?: string;
  endDate?: string;
  users: SprintUserPerformance[];
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
  const [kpis, setKpis] = useState<ProjectKpisSummary | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const usersCardTitle = "Tasks completed by user · All sprints";

  useEffect(() => {
    const initializeKpiPage = async () => {
      try {
        setLoading(true);
        setKpisLoading(true);
        setSprintsLoading(true);
        const projectIdParam = searchParams.get("projectId");
        const parsedProjectId = projectIdParam !== null ? Number(projectIdParam) : NaN;
        const validProjectIdFromQuery = Number.isFinite(parsedProjectId)
          ? parsedProjectId
          : undefined;

        const projects = await projectService.listProjects();
        const fallbackProjectId = projects.length > 0 ? projects[0].idProject : 1;
        const resolvedProjectId = validProjectIdFromQuery ?? fallbackProjectId;
        setProjectId(resolvedProjectId);

        // Set project title from the resolved project
        const resolvedProject = projects.find((p) => p.idProject === resolvedProjectId);
        const projectTitle = resolvedProject?.title || "Project KPIs";
        setProjectTitle(projectTitle);

        const kpisData = await kpiService.getProjectKpisSummary(resolvedProjectId);
        setKpis(kpisData);

        const projectSprints = await sprintService.listSprints(resolvedProjectId);
        const sortedSprints = [...projectSprints].sort((a, b) => a.sprintNumber - b.sprintNumber);
        setSprints(sortedSprints);

        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to initialize KPI data";
        setError(errorMessage);
        console.error("Error initializing KPI page:", err);
      } finally {
        setSprintsLoading(false);
        setKpisLoading(false);
      }
    };

    void initializeKpiPage();
  }, [searchParams]);

  useEffect(() => {
    const fetchUsersAcrossSprints = async () => {
      if (projectId === null || sprintsLoading) {
        return;
      }

      if (sprints.length === 0) {
        setTasksBySprint([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const sprintMetrics = await Promise.all(
          sprints.map((sprint) => metricsService.getTasksDoneByUserInSprint(sprint.idSprint))
        );

        const structuredSprintData: SprintTasksByUser[] = sprints.map((sprint, index) => ({
          sprintId: sprint.idSprint,
          sprintNumber: sprint.sprintNumber,
          sprintTitle: sprint.title,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          users: sprintMetrics[index] ?? [],
        }));

        setTasksBySprint(structuredSprintData);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch user tasks data";
        setError(errorMessage);
        console.error("Error fetching user metrics by sprint:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchUsersAcrossSprints();
  }, [projectId, sprints, sprintsLoading]);

  const handleBackToKanban = useCallback(() => {
    router.push("/");
  }, [router]);

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
      sectionsConfig={{
        progress: { show: false },
      }}
      showSidebarToggle={true}
      onSidebarToggle={() => {
        // This will be handled by AppLayout
      }}
    />
  );

  const mainContent = (
    <main className="flex-1 min-h-0 overflow-y-auto app-background px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-[1680px] space-y-6">
        <section className="kpi-section-enter">
          <div className="w-full rounded-2xl border border-border bg-card/60 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.2)] md:p-6">
            <div className="mb-4 text-center">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Key indicators
              </h2>
            </div>

            {kpisLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : kpis ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TotalTasksKpi
                  total={kpis.totalTasks}
                  backlog={kpis.tasksBacklog}
                  ready={kpis.tasksReady}
                  inProgress={kpis.tasksInProgress}
                  review={kpis.tasksReview}
                  done={kpis.tasksDone}
                />
                <TotalHoursKpi
                  realHours={kpis.realHours}
                  estimatedHours={kpis.estimatedHours}
                />
                <AvgTasksKpi
                  totalTasks={kpis.totalTasks}
                  totalDevs={kpis.totalDevs}
                  sprintTasks={kpis.sprintTasks}
                  sprintDevs={kpis.sprintDevs}
                />
                <AvgHoursDevKpi
                  totalHours={kpis.realHours}
                  totalDevs={kpis.totalDevs}
                  expectedHoursPerDev={kpis.expectedHoursPerDev}
                  sprintRealHours={kpis.sprintRealHours}
                  sprintEstimatedHours={kpis.sprintEstimatedHours}
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
          {/* ── User Tasks Completion KPI ── */}
          <section className="kpi-section-enter">
            {error ? (
              <div className="kpi-error-box rounded-lg border p-4">
                Error loading data: {error}
              </div>
            ) : loading ? (
              <div className="kpi-panel rounded-lg border border-border p-4 text-muted-foreground">
                Loading user task data...
              </div>
            ) : (
              <UserTasksCompletionKpi sprintData={tasksBySprint} title={usersCardTitle} />
            )}
          </section>

          {/* ── Real Total Hours by User KPI ── */}
          <section className="kpi-section-enter">
            <RealTotalHoursByUserKpi sprintOptions={sprints} taskSprintData={tasksBySprint} />
          </section>
        </section>
      </div>
    </main>
  );

  return (
    <AppLayout
      onMembersClick={() => {
        // Members dialog not shown in KPIs page
      }}
    >
      <div className="h-full min-h-0 flex flex-col">
        {headerContent}
        {mainContent}
      </div>
    </AppLayout>
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