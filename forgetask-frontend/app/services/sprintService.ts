import type { SprintCreateRequest, SprintOption } from "@/app/types/sprint";
import { getApiBaseUrl } from "@/app/services/apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

class SprintService {
  private buildSprintWriteError(action: "create" | "update", response: Response): Error {
    if (response.status === 409) {
      return new Error("Sprint dates overlap with an existing sprint. Choose a different date range.");
    }

    return new Error(`Failed to ${action} sprint: ${response.status} ${response.statusText}`);
  }

  async listSprints(projectId?: number): Promise<SprintOption[]> {
    const query = projectId !== undefined ? `?projectId=${projectId}` : "";
    const response = await fetch(`${API_BASE_URL}/api/sprints${query}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sprints: ${response.statusText}`);
    }

    return await response.json();
  }

  async createSprint(request: SprintCreateRequest): Promise<SprintOption> {
    const response = await fetch(`${API_BASE_URL}/api/sprints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw this.buildSprintWriteError("create", response);
    }

    return await response.json();
  }

  async updateSprint(sprintId: number, request: SprintCreateRequest): Promise<SprintOption> {
    const response = await fetch(`${API_BASE_URL}/api/sprints/${sprintId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw this.buildSprintWriteError("update", response);
    }

    return await response.json();
  }

  async deleteSprint(sprintId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/sprints/${sprintId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete sprint: ${response.status} ${response.statusText}`);
    }
  }
}

const sprintService = new SprintService();
export default sprintService;
