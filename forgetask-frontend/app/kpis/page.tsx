"use client";

import { useEffect, useState } from "react";
import TotalTasksKpi from "../components/kpis/TotalTasksKpi";
import TotalHoursKpi from "../components/kpis/TotalHoursKpi";
import AvgTasksKpi from "../components/kpis/AvgTasksKpi";
import AvgHoursDevKpi from "../components/kpis/AvgHoursDevKpi";
import UserTasksCompletionKpi from "../components/kpis/UserTasksCompletionKpi";
import RealTotalHoursByUserKpi from "@/app/components/chart/RealTotalHoursByUserKpi";

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<ProjectKpisSummary | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  useEffect(() => {
    const fetchUserTasksData = async () => {
      try {
        setLoading(true);
        setKpisLoading(true);
        // Get the sprint ID
        const sprintId = 5; // HARDCODED: MODIFY LATER
        
        const data: SprintUserPerformance[] =
          await metricsService.getTasksDoneByUserInSprint(sprintId);

        // Transform the API response to match UserTasksCompletionKpi's User interface
        const transformedUsers: User[] = data.map((userPerf) => ({
          id: userPerf.idUser.toString(),
          name: userPerf.displayName,
          completedTasks: userPerf.doneCount,
          totalTasks: userPerf.totalCount,
        }));

        setUsers(transformedUsers);

        const projectId = 1; // HARDCODED: MODIFY LATER
        const kpisData = await kpiService.getProjectKpisSummary(projectId);
        setKpis(kpisData);

        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch user tasks data";
        setError(errorMessage);
        console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
        setKpisLoading(false);
      }
    };

    fetchUserTasksData();
  }, []);

  return (
    <main className="px-6 py-4">
      {/* ── Sección KPIs ── */}
      {kpisLoading ? (
        // Skeleton mientras cargan los datos
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : kpis ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-start">
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
        </section>
      ) : null}

      {/* ── User Tasks Completion KPI ── */}
      <section className="mb-10">
        {error ? (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            Error loading data: {error}
          </div>
        ) : loading ? (
          <div className="p-4 text-gray-500">Loading user task data...</div>
        ) : (
          <UserTasksCompletionKpi users={users} />
        )}
      </section>

      {/* ── Real Total Hours by User KPI ── */}
      <section className="mb-10">
        <RealTotalHoursByUserKpi />
      </section>
    </main>
  );
}