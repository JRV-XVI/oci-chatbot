/**
 * KPI API Service
 * Handles all KPI calculation and retrieval from the backend
 * This service will call the KPI endpoints for performance metrics
 */
import type { Task } from "@/app/types/task";
import { getApiBaseUrl } from "@/app/services/apiBaseUrl";

export interface KPIMetrics {
  totalTasks: number;
  completedTasks: number;
  backlogCount: number;
  readyCount: number;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;

  totalEstimatedHours: number;
  totalRealHours: number;
  completedEstimatedHours: number;
  timeVariance: number;
  progressPercentage: number;

  isBacklogOverloaded: boolean;
  isReadyOverloaded: boolean;
  isInProgressOverloaded: boolean;
  isReviewOverloaded: boolean;
  isDoneOverloaded: boolean;
}

export interface KPICalculationRequest {
  tasks: Task[];
  expectedTaskCounts?: Record<string, number>;
}

export interface TaskDistribution {
  [key: string]: number;
}

export interface TimeMetricsSummary {
  totalEstimatedHours: number;
  totalRealHours: number;
  variance: number;
}

export interface RealHoursByUser {
  username: string;
  displayName: string;
  realTotalHours: number;
  doneTasks: number;
}

export interface RealHoursTaskDetail {
  taskId: string;
  title: string;
  realTime: number;
}

export interface RealHoursBySprintUser {
  sprintId: number;
  sprintNumber: number;
  sprintTitle: string;
  username: string;
  displayName: string;
  realTotalHours: number;
  doneTasks: number;
}

export interface ProjectKpisSummary {
  // KPI 1 — TotalTasksKpi
  totalTasks: number;
  tasksBacklog: number;
  tasksReady: number;
  tasksInProgress: number;
  tasksReview: number;
  tasksDone: number;

  // KPI 2 — TotalHoursKpi
  realHours: number;
  estimatedHours: number;

  // KPI 3 — AvgTasksKpi
  totalDevs: number;
  avgTasksPerDev: number;
  sprintTasks?: number;
  sprintDevs?: number;

  // KPI 4 — AvgHoursDevKpi
  avgHoursPerDev: number;
  expectedHoursPerDev: number;
  sprintRealHours?: number;
  sprintEstimatedHours?: number;
}

const API_BASE_URL = getApiBaseUrl();

class KPIService {
  /**
   * Get real worked hours grouped by user.
   * Optionally filtered by sprintId.
   */
  async getRealHoursByUser(sprintId?: number): Promise<RealHoursByUser[]> {
    try {
      const query = sprintId !== undefined ? `?sprintId=${sprintId}` : "";
      const response = await fetch(`${API_BASE_URL}/api/kpi/real-hours-by-user${query}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch real hours by user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching real hours by user:", error);
      throw error;
    }
  }

  /**
   * Get done tasks for one user in KPI drill-down.
   * Optionally filtered by sprintId.
   */
  async getRealHoursTasksByUser(
    username: string,
    sprintId?: number
  ): Promise<RealHoursTaskDetail[]> {
    try {
      const params = new URLSearchParams();
      params.set("username", username);
      if (sprintId !== undefined) {
        params.set("sprintId", String(sprintId));
      }

      const response = await fetch(
        `${API_BASE_URL}/api/kpi/real-hours-by-user/tasks?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch real hours tasks by user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching real hours tasks by user:", error);
      throw error;
    }
  }

  /**
   * Get general KPI rows where topic is sprint and group is user.
   * Optionally filtered by one sprint.
   */
  async getRealHoursBySprintUser(sprintId?: number): Promise<RealHoursBySprintUser[]> {
    try {
      const params = new URLSearchParams();
      if (sprintId !== undefined) {
        params.set("sprintId", String(sprintId));
      }

      const response = await fetch(
        `${API_BASE_URL}/api/kpi/real-hours-by-sprint-user?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch real hours by sprint-user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching real hours by sprint-user:", error);
      throw error;
    }
  }

  /**
   * Calculate KPI metrics from a list of tasks
   * Includes overload detection based on expected task counts
   */
  async calculateKPIs(
    tasks: Task[],
    expectedTaskCounts?: Record<string, number>
  ): Promise<KPIMetrics> {
    try {
      const request: KPICalculationRequest = {
        tasks,
        expectedTaskCounts,
      };

      const response = await fetch(`${API_BASE_URL}/api/kpi/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate KPIs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error calculating KPIs:", error);
      throw error;
    }
  }

  /**
   * Calculate KPI metrics without overload detection
   * Simplified version for basic KPI calculations
   */
  async calculateKPIsSimple(tasks: Task[]): Promise<KPIMetrics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kpi/calculate-simple`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tasks),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to calculate KPIs: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error calculating KPIs:", error);
      throw error;
    }
  }

  /**
   * Get task distribution by status
   */
  async getTaskDistribution(tasks: Task[]): Promise<TaskDistribution> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kpi/distribution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tasks),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to get task distribution: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting task distribution:", error);
      throw error;
    }
  }

  /**
   * Get time metrics summary
   */
  async getTimeSummary(tasks: Task[]): Promise<TimeMetricsSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kpi/time-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tasks),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to get time summary: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting time summary:", error);
      throw error;
    }
  }

  /**
   * Check KPI service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kpi/health`, {
        method: "GET",
      });

      return response.ok;
    } catch (error) {
      console.error("Error checking KPI service health:", error);
      return false;
    }
  }

  /**
   * Obtiene los 4 KPIs del dashboard en una sola llamada.
   * GET /api/kpi/project/{projectId}/summary
   */
  async getProjectKpisSummary(projectId: number): Promise<ProjectKpisSummary> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/kpi/project/${projectId}/summary`,
        {
          method: "GET",
          cache: "no-store", // siempre datos frescos, sin caché
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch project KPIs summary: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching project KPIs summary:", error);
      throw error;
    }
  }
}

const kpiService = new KPIService();

export default kpiService;