import type { ProjectOption } from "@/app/types/project";
import { getApiBaseUrl } from "@/app/services/apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

class ProjectService {
  async listProjects(): Promise<ProjectOption[]> {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    return await response.json();
  }
}

const projectService = new ProjectService();
export default projectService;
