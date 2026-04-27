import { fetchWithAuth } from "@/app/services/apiClient";
import { getAuthData } from "@/app/services/authUtils";

interface CurrentSprintResponse {
  idSprint: number;
  idProject: number;
  sprintNumber: number;
  title: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

interface GeneratedReport {
  blob: Blob;
  filename: string;
}

function getFilenameFromContentDisposition(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ?? null;
}

class ReportService {
  async generateCurrentSprintPdfReport(): Promise<GeneratedReport> {
    const { projectId } = getAuthData();

    if (!projectId) {
      throw new Error("No se encontro projectId en la sesion actual.");
    }

    const currentSprintResponse = await fetchWithAuth(`/sprints/current?projectId=${projectId}`, {
      method: "GET",
    });

    if (!currentSprintResponse.ok) {
      throw new Error(`No se pudo obtener el sprint actual: ${currentSprintResponse.status} ${currentSprintResponse.statusText}`);
    }

    const currentSprint: CurrentSprintResponse = await currentSprintResponse.json();

    if (!currentSprint?.idSprint) {
      throw new Error("La API de sprint actual no devolvio idSprint.");
    }

    const reportResponse = await fetchWithAuth(
      `/reports/generate/pdf?projectId=${projectId}&sprintId=${currentSprint.idSprint}`,
      {
        method: "GET",
      }
    );

    if (!reportResponse.ok) {
      throw new Error(`No se pudo generar el PDF: ${reportResponse.status} ${reportResponse.statusText}`);
    }

    const blob = await reportResponse.blob();
    const filename =
      getFilenameFromContentDisposition(reportResponse.headers.get("content-disposition")) ??
      `project-report-sprint-${currentSprint.idSprint}.pdf`;

    return { blob, filename };
  }
}

const reportService = new ReportService();
export default reportService;
