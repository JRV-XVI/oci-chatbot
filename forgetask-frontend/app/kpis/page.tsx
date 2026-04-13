"use client";

import { useEffect, useState } from "react";
import TotalTasksKpi from "../components/kpis/TotalTasksKpi";
import TotalHoursKpi from "../components/kpis/TotalHoursKpi";
import AvgTasksKpi from "../components/kpis/AvgTasksKpi";
import AvgHoursDevKpi from "../components/kpis/AvgHoursDevKpi";
import UserTasksCompletionKpi from "../components/kpis/UserTasksCompletionKpi";
import metricsService, {
  type SprintUserPerformance,
} from "../services/metricsService";

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

  useEffect(() => {
    const fetchUserTasksData = async () => {
      try {
        setLoading(true);
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
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch user tasks data";
        setError(errorMessage);
        console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTasksData();
  }, []);

  return (
    <main className="p-8">
      {/* ── Sección KPIs ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 items-start">
        <TotalTasksKpi total={142} done={92} inProgress={28} todo={22} />
        <TotalHoursKpi realHours={50} estimatedHours={100} />
        <AvgTasksKpi totalTasks={142} totalDevs={14} />
        <AvgHoursDevKpi totalHours={250} totalDevs={4} expectedHours={60} />
      </section>

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
    </main>
  );
}