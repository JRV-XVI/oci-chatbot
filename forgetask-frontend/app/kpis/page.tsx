"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProjectHeader } from "@/app/components/kanban/project-header";
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

interface User {
  id: string;
  name: string;
  completedTasks: number;
  totalTasks: number;
}

export default function KPIsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>("Project KPIs");
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<ProjectKpisSummary | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const getSprintLabel = (sprint: SprintOption): string => `Sprint ${sprint.sprintNumber}: ${sprint.title}`;
  const selectedSprint = sprints.find((sprint) => sprint.idSprint === selectedSprintId);
  const usersCardTitle = selectedSprint
    ? `Tareas completadas por usuario · Sprint ${selectedSprint.sprintNumber}`
    : "Tareas completadas por usuario";

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

        const sprintIdParam = searchParams.get("sprintId");
        const parsedSprintId = sprintIdParam !== null ? Number(sprintIdParam) : NaN;
        const validSprintIdFromQuery = Number.isFinite(parsedSprintId)
          ? parsedSprintId
          : undefined;

        const sprintIdFromQueryExists =
          validSprintIdFromQuery !== undefined &&
          sortedSprints.some((sprint) => sprint.idSprint === validSprintIdFromQuery);

        const fallbackSprintId = sortedSprints.length > 0 ? sortedSprints[0].idSprint : null;
        setSelectedSprintId(sprintIdFromQueryExists ? validSprintIdFromQuery! : fallbackSprintId);

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
    const fetchUsersBySprint = async () => {
      if (projectId === null) {
        return;
      }

      if (selectedSprintId === null) {
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data: SprintUserPerformance[] =
          await metricsService.getTasksDoneByUserInSprint(selectedSprintId);

        const transformedUsers: User[] = data.map((userPerf) => ({
          id: userPerf.idUser.toString(),
          name: userPerf.displayName,
          completedTasks: userPerf.doneCount,
          totalTasks: userPerf.totalCount,
        }));

        setUsers(transformedUsers);
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

    void fetchUsersBySprint();
  }, [projectId, selectedSprintId]);

  const handleBackToKanban = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="h-full flex flex-col min-h-0">
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
            },
          ],
        }}
        sectionsConfig={{
          progress: { show: false },
        }}
      />

      <main className="flex-1 min-h-0 overflow-y-auto app-background px-6 py-6">
      <div className="mx-auto max-w-8xl">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:items-start">
          <section className="space-y-8 xl:col-span-4">
            <section className="rounded-xl border border-[#2b3542] bg-[#0d1117] p-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9aa4b2]">
                  Sprint para KPIs de usuario
                </span>
                <select
                  value={selectedSprintId ?? ""}
                  onChange={(event) => {
                    const nextSprintId = Number(event.target.value);
                    setSelectedSprintId(Number.isFinite(nextSprintId) ? nextSprintId : null);
                  }}
                  className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] focus-visible:outline-none"
                  disabled={sprintsLoading || sprints.length === 0}
                >
                  {sprintsLoading ? (
                    <option value="">Cargando sprints...</option>
                  ) : null}
                  {!sprintsLoading && sprints.length === 0 ? (
                    <option value="">Sin sprints disponibles</option>
                  ) : null}
                  {sprints.map((sprint) => (
                    <option key={sprint.idSprint} value={String(sprint.idSprint)}>
                      {getSprintLabel(sprint)}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {/* ── User Tasks Completion KPI ── */}
            <section>
              {error ? (
                <div className="rounded-lg border border-[#c45223]/45 bg-[#e76b36]/10 p-4 text-[#ffb28e]">
                  Error loading data: {error}
                </div>
              ) : loading ? (
                <div className="p-4 text-[#9aa4b2]">Loading user task data...</div>
              ) : (
                <UserTasksCompletionKpi users={users} title={usersCardTitle} />
              )}
            </section>

            {/* ── Real Total Hours by User KPI ── */}
            <section>
              <RealTotalHoursByUserKpi selectedSprintId={selectedSprintId ?? undefined} />
            </section>
          </section>

          <aside className="xl:col-span-1">
            <section className="rounded-2xl border border-[#2b3542] bg-gradient-to-b from-[#111825] via-[#0f1722] to-[#0d1117] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)] md:p-5 xl:sticky xl:top-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9aa4b2]">
                  Indicadores clave
                </h2>
              </div>

              {kpisLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : kpis ? (
                <div className="space-y-4">
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
                <div className="rounded-lg border border-[#2b3542] bg-[#0d1117] p-4 text-sm text-[#9aa4b2]">
                  No hay datos de KPIs para este proyecto.
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
      </main>
    </div>
  );
}