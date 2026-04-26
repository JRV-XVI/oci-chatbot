/**
 * AI Service
 * Handles calls to the AI management report endpoint.
 */
import { getApiBaseUrl } from "@/app/services/apiBaseUrl";

export interface ManagementReport {
  report: string;
  projectId: string;
}

const API_BASE_URL = getApiBaseUrl();

class AiService {
  /**
   * Generates an AI management report for the given project.
   * GET /api/ai/report?projectId={id}
   */
  async getManagementReport(projectId: number): Promise<ManagementReport> {
    const response = await fetch(
      `${API_BASE_URL}/api/ai/report?projectId=${projectId}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate management report: ${response.statusText}`);
    }

    return await response.json();
  }
}

const aiService = new AiService();
export default aiService;
