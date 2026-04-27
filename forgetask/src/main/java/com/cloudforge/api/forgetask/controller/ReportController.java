package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.SprintOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import com.cloudforge.api.forgetask.service.LLMService;
import com.cloudforge.api.forgetask.service.PDFGeneratorService;
import com.cloudforge.api.forgetask.service.ReportGeneratorService;
import com.cloudforge.api.forgetask.service.TelegramReportService;
import org.telegram.telegrambots.meta.generics.TelegramClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST Controller for AI-generated management reports.
 *
 * FIX (único cambio respecto al original):
 *   Los 3 endpoints llamaban taskController.getAllTasks() sin ningún filtro,
 *   por lo que todos los sprints mostraban las mismas 218 tareas.
 *   Se agregó el método privado filterTasks() que filtra la lista por sprintId
 *   (y por projectId si TaskDTO lo tuviera — actualmente no tiene getProjectId,
 *   así que solo se filtra por sprint).
 *   KPIService y ReportGeneratorService NO fueron modificados.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private static final Logger logger = LoggerFactory.getLogger(ReportController.class);

    private final ReportGeneratorService reportGeneratorService;
    private final PDFGeneratorService    pdfGeneratorService;
    private final LLMService             llmService;
    private final SprintController       sprintController;
    private final TaskController         taskController;
    private final TelegramReportService  telegramReportService;
    private final TelegramClient         telegramClient;

    public ReportController(
        ReportGeneratorService reportGeneratorService,
        PDFGeneratorService    pdfGeneratorService,
        LLMService             llmService,
        SprintController       sprintController,
        TelegramReportService  telegramReportService,
        TelegramClient         telegramClient,
        TaskController         taskController
    ) {
        this.reportGeneratorService = reportGeneratorService;
        this.pdfGeneratorService    = pdfGeneratorService;
        this.llmService             = llmService;
        this.sprintController       = sprintController;
        this.telegramReportService  = telegramReportService;
        this.telegramClient         = telegramClient;
        this.taskController         = taskController;
    }

    // -------------------------------------------------------------------------
    // Health check
    // -------------------------------------------------------------------------

    /** GET /api/reports/health */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status",         "ok");
        response.put("service",        "report-api");
        response.put("llm_configured", llmService.isConfigured());
        return ResponseEntity.ok(response);
    }

    // -------------------------------------------------------------------------
    // Telegram current sprint context
    // -------------------------------------------------------------------------

    /**
     * Resolve active sprint + tasks + status stats for Telegram current-sprint report.
     * GET /api/reports/telegram/current-sprint?projectId=1
     */
    @GetMapping("/telegram/current-sprint")
    public ResponseEntity<?> getTelegramCurrentSprintContext(
        @RequestParam(required = false) Integer projectId
    ) {
        try {
            ResponseEntity<SprintOptionDTO> sprintResponse = sprintController.getCurrentSprint(projectId);
            if (!sprintResponse.getStatusCode().is2xxSuccessful() || sprintResponse.getBody() == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No active sprint found for this project"));
            }

            SprintOptionDTO sprint = sprintResponse.getBody();
            ResponseEntity<List<TaskDTO>> taskResponse = taskController.getTasksByProjectAndSprint(
                sprint.getIdProject(),
                sprint.getIdSprint()
            );

            List<TaskDTO> tasks = taskResponse.getBody() != null ? taskResponse.getBody() : List.of();

            long backlog = tasks.stream().filter(t -> "backlog".equalsIgnoreCase(t.getStatus())).count();
            long ready = tasks.stream().filter(t -> "ready".equalsIgnoreCase(t.getStatus())).count();
            long inProgress = tasks.stream().filter(t -> "in-progress".equalsIgnoreCase(t.getStatus())).count();
            long review = tasks.stream().filter(t -> "review".equalsIgnoreCase(t.getStatus())).count();
            long done = tasks.stream().filter(t -> "done".equalsIgnoreCase(t.getStatus())).count();

            Map<String, Object> response = new HashMap<>();
            response.put("projectId", sprint.getIdProject());
            response.put("currentSprintId", sprint.getIdSprint());
            response.put("currentSprintTitle", sprint.getTitle());
            response.put("startDate", sprint.getStartDate());
            response.put("endDate", sprint.getEndDate());
            response.put("totalTasks", tasks.size());
            response.put("statusBreakdown", Map.of(
                "backlog", backlog,
                "ready", ready,
                "inProgress", inProgress,
                "review", review,
                "done", done
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error resolving Telegram current sprint context", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to resolve current sprint context: " + e.getMessage()));
        }
    }

    /**
     * Trigger Telegram report generation for current sprint only.
     * POST /api/reports/telegram/current-sprint/send?chatId=123456&projectId=1
     */
    @PostMapping("/telegram/current-sprint/send")
    public ResponseEntity<?> sendTelegramCurrentSprintReport(
        @RequestParam long chatId,
        @RequestParam(required = false) Integer projectId
    ) {
        try {
            telegramReportService.generateAndSendReport(chatId, projectId, null, telegramClient);
            return ResponseEntity.accepted().body(Map.of(
                "status", "accepted",
                "message", "Telegram current sprint report generation started"
            ));
        } catch (Exception e) {
            logger.error("Error triggering Telegram current sprint report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to trigger Telegram report: " + e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // PDF report
    // -------------------------------------------------------------------------

    /**
     * Generate and download PDF report for a sprint.
     * GET /api/reports/generate/pdf?projectId=1&sprintId=7
     */
    @GetMapping("/generate/pdf")
    public ResponseEntity<?> generatePDFReport(
        @RequestParam(required = false) Integer projectId,
        @RequestParam(required = false) Integer sprintId
    ) {
        try {
            if (!llmService.isConfigured()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "LLM not configured. Please set LLM_API_KEY in .env"));
            }

            logger.info("Generating PDF report for Project: {}, Sprint: {}", projectId, sprintId);

            // FIX: filter tasks by sprint before passing them to the report generator.
            List<TaskDTO> tasks = getFilteredTasks(projectId, sprintId);

            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);
            byte[] pdfBytes      = pdfGeneratorService.generatePDF(reportContent, projectId, sprintId);
            String filename      = pdfGeneratorService.generateFilename(projectId, sprintId);

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .body(pdfBytes);

        } catch (Exception e) {
            logger.error("Error generating PDF report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // Text report (fallback / debug)
    // -------------------------------------------------------------------------

    /**
     * Generate and return report as plain text.
     * GET /api/reports/generate/text?projectId=1&sprintId=7
     */
    @GetMapping("/generate/text")
    public ResponseEntity<?> generateTextReport(
        @RequestParam(required = false) Integer projectId,
        @RequestParam(required = false) Integer sprintId
    ) {
        try {
            if (!llmService.isConfigured()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "LLM not configured. Please set LLM_API_KEY in .env"));
            }

            logger.info("Generating text report for Project: {}, Sprint: {}", projectId, sprintId);

            List<TaskDTO> tasks = getFilteredTasks(projectId, sprintId);
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);

            Map<String, Object> response = new HashMap<>();
            response.put("content",   reportContent);
            response.put("projectId", projectId);
            response.put("sprintId",  sprintId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error generating text report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // HTML report
    // -------------------------------------------------------------------------

    /**
     * Generate report as HTML for web rendering.
     * GET /api/reports/generate/html?projectId=1&sprintId=7
     */
    @GetMapping("/generate/html")
    public ResponseEntity<?> generateHTMLReport(
        @RequestParam(required = false) Integer projectId,
        @RequestParam(required = false) Integer sprintId
    ) {
        try {
            if (!llmService.isConfigured()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "LLM not configured. Please set LLM_API_KEY in .env"));
            }

            logger.info("Generating HTML report for Project: {}, Sprint: {}", projectId, sprintId);

            List<TaskDTO> tasks = getFilteredTasks(projectId, sprintId);
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);
            String htmlContent   = convertToHTML(reportContent);

            return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(htmlContent);

        } catch (Exception e) {
            logger.error("Error generating HTML report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Fetch all tasks and filter by sprintId (and projectId when available).
     *
     * TaskDTO currently has getSprintId() but not getProjectId(), so filtering
     * is done only by sprint. If sprintId is null, all tasks are returned
     * (project-level report).
     *
     * Note: an empty result after filtering is NOT treated as an error —
     * the LLM will generate a report indicating the sprint has no tasks yet.
     */
    private List<TaskDTO> getFilteredTasks(Integer projectId, Integer sprintId) {
        ResponseEntity<List<TaskDTO>> response = taskController.getAllTasks();
        List<TaskDTO> all = response.getBody();

        if (all == null) {
            return List.of();
        }

        if (sprintId == null) {
            // No sprint filter requested → return all tasks (project-level report).
            return all;
        }

        List<TaskDTO> filtered = all.stream()
            .filter(t -> sprintId.equals(t.getSprintId()))
            .collect(Collectors.toList());

        logger.info("Task filter: {} total → {} for sprintId={}", all.size(), filtered.size(), sprintId);
        return filtered;
    }

    private String convertToHTML(String textContent) {
        String htmlContent = textContent
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\n", "<br/>");

        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Management Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
                    .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    h1 { color: #2c3e50; text-align: center; }
                    .metadata { color: #7f8c8d; text-align: center; font-size: 0.9em; margin-bottom: 20px; }
                    .content { line-height: 1.6; color: #2c3e50; font-size: 0.95em; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d; font-size: 0.85em; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>AI-Generated Management Report</h1>
                    <div class="metadata">Report generated for sprint analysis</div>
                    <div class="content">
            """ + htmlContent + """
                    </div>
                    <div class="footer">
                        This is an AI-generated report. Please review for accuracy before distribution.
                    </div>
                </div>
            </body>
            </html>
            """;
    }
}