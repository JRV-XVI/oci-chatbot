import { getApiBaseUrl } from "@/app/services/apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

export interface SprintUserPerformance {
  idUser: number;
  idProject: number;
  username: string;
  displayName: string;
  role: string;
  doneCount: number;
  totalCount: number;
}

class MetricsService {
  async getTasksDoneByUserInSprint(sprintId: number): Promise<SprintUserPerformance[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/metrics/sprints/${sprintId}/tasks-done-by-user`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tasks done by user: ${response.statusText}`
      );
    }

    return await response.json();
  }
}

export default new MetricsService();
