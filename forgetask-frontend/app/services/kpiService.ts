/**
 * KPI API Service
 * Handles all KPI calculation and retrieval from the backend
 * This service will call the KPI endpoints for performance metrics
 */
import type { Task } from "@/app/types/task";

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

class KPIService {
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
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error checking KPI service health:", error);
      return false;
    }
  }
}

const kpiService = new KPIService();

export default kpiService;