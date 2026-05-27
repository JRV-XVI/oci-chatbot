import { fetchWithAuth } from "./apiClient";

export interface HealthResponse {
  status: string;
  service: string;
  namespace: string;
  version: string;
}

const healthService = {
  getHealth: async (): Promise<HealthResponse> => {
    const response = await fetchWithAuth("/health", { method: "GET" });
    if (!response.ok) {
      throw new Error("Failed to fetch health info");
    }
    return response.json();
  },
};

export default healthService;