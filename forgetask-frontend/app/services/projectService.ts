import type { ProjectOption } from "@/app/types/project";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
