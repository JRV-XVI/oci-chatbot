package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.KPIMetrics;
import com.cloudforge.api.forgetask.dto.RealHoursByUserDTO;
import com.cloudforge.api.forgetask.dto.SprintOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import com.cloudforge.api.forgetask.service.KPIService;
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

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private static final Logger logger = LoggerFactory.getLogger(ReportController.class);

    private final ReportGeneratorService reportGeneratorService;
    private final PDFGeneratorService    pdfGeneratorService;
    private final LLMService             llmService;
    private final KPIService             kpiService;
    private final SprintController       sprintController;
    private final TaskController         taskController;
    private final TelegramReportService  telegramReportService;
    private final TelegramClient         telegramClient;

    public ReportController(
        ReportGeneratorService reportGeneratorService,
        PDFGeneratorService    pdfGeneratorService,
        LLMService             llmService,
        KPIService             kpiService,
        SprintController       sprintController,
        TelegramReportService  telegramReportService,
        TelegramClient         telegramClient,
        TaskController         taskController
    ) {
        this.reportGeneratorService = reportGeneratorService;
        this.pdfGeneratorService    = pdfGeneratorService;
        this.llmService             = llmService;
        this.kpiService             = kpiService;
        this.sprintController       = sprintController;
        this.telegramReportService  = telegramReportService;
        this.telegramClient         = telegramClient;
        this.taskController         = taskController;
    }

    // ─────────────────────────────────────────────
    // Health check
    // ─────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status",         "ok");
        response.put("service",        "report-api");
        response.put("llm_configured", llmService.isConfigured());
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────
    // Telegram – current sprint
    // ─────────────────────────────────────────────

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
            List<TaskDTO> tasks = getFilteredTasks(sprint.getIdProject(), sprint.getIdSprint());

            long backlog    = tasks.stream().filter(t -> "backlog".equalsIgnoreCase(t.getStatus())).count();
            long ready      = tasks.stream().filter(t -> "ready".equalsIgnoreCase(t.getStatus())).count();
            long inProgress = tasks.stream().filter(t -> "in-progress".equalsIgnoreCase(t.getStatus())).count();
            long review     = tasks.stream().filter(t -> "review".equalsIgnoreCase(t.getStatus())).count();
            long done       = tasks.stream().filter(t -> "done".equalsIgnoreCase(t.getStatus())).count();

            Map<String, Object> response = new HashMap<>();
            response.put("projectId",          sprint.getIdProject());
            response.put("currentSprintId",    sprint.getIdSprint());
            response.put("currentSprintTitle", sprint.getTitle());
            response.put("startDate",          sprint.getStartDate());
            response.put("endDate",            sprint.getEndDate());
            response.put("totalTasks",         tasks.size());
            response.put("statusBreakdown", Map.of(
                "backlog", backlog, "ready", ready,
                "inProgress", inProgress, "review", review, "done", done
            ));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error resolving Telegram current sprint context", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to resolve current sprint context: " + e.getMessage()));
        }
    }

    @PostMapping("/telegram/current-sprint/send")
    public ResponseEntity<?> sendTelegramCurrentSprintReport(
        @RequestParam long chatId,
        @RequestParam(required = false) Integer projectId
    ) {
        try {
            telegramReportService.generateAndSendReport(chatId, projectId, null, telegramClient);
            return ResponseEntity.accepted().body(Map.of(
                "status",  "accepted",
                "message", "Telegram current sprint report generation started"
            ));
        } catch (Exception e) {
            logger.error("Error triggering Telegram current sprint report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to trigger Telegram report: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────
    // PDF report  ← UPDATED
    // ─────────────────────────────────────────────

    /**
     * GET /api/reports/generate/pdf?projectId=1&sprintId=7
     *
     * Generates a visual PDF with KPI cards, SVG charts, per-user table,
     * and the AI-generated narrative.
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

            logger.info("Generating PDF report – Project: {}, Sprint: {}", projectId, sprintId);

            // 1. Tasks filtered by sprint
            List<TaskDTO> tasks = getFilteredTasks(projectId, sprintId);

            // 2. KPI calculations
            KPIMetrics kpi = kpiService.calculateKPIs(tasks);

            // 3. Per-user hours (from DB, filtered by sprint)
            List<RealHoursByUserDTO> userHoursRaw = kpiService.getRealHoursByUser(sprintId);

            // 4. Build metrics map for PDFGeneratorService
            Map<String, Object> metricsMap = buildMetricsMap(kpi);

            // 5. Convert userHours to List<Map>
            List<Map<String, Object>> userHours = toUserHoursMaps(userHoursRaw);

            // 6. AI-generated narrative
            String narrative = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks, userHours);

            // 7. Render PDF
            byte[] pdfBytes = pdfGeneratorService.generatePDF(narrative, projectId, sprintId, metricsMap, userHours);
            String filename = pdfGeneratorService.generateFilename(projectId, sprintId);

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);

        } catch (Exception e) {
            logger.error("Error generating PDF report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────
    // Text report (debug / fallback)
    // ─────────────────────────────────────────────

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

            List<TaskDTO> tasks = getFilteredTasks(projectId, sprintId);
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);

            return ResponseEntity.ok(Map.of(
                "content",   reportContent,
                "projectId", projectId,
                "sprintId",  sprintId
            ));

        } catch (Exception e) {
            logger.error("Error generating text report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────
    // HTML report
    // ─────────────────────────────────────────────

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

            List<TaskDTO> tasks = getFilteredTasks(projectId, sprintId);
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);

            return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(convertToHTML(reportContent));

        } catch (Exception e) {
            logger.error("Error generating HTML report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────

    /** Fetch tasks and filter by sprint (and project when TaskDTO exposes it). */
    private List<TaskDTO> getFilteredTasks(Integer projectId, Integer sprintId) {
        ResponseEntity<List<TaskDTO>> response = taskController.getAllTasks();
        List<TaskDTO> all = response.getBody();
        if (all == null) return List.of();
        if (sprintId == null) return all;

        List<TaskDTO> filtered = all.stream()
            .filter(t -> sprintId.equals(t.getSprintId()))
            .collect(Collectors.toList());

        logger.info("Task filter: {} total → {} for sprintId={}", all.size(), filtered.size(), sprintId);
        return filtered;
    }

    /**
     * Build the metrics map expected by PDFGeneratorService.
     * Efficiency rate = (done / total) * 100, capped at 100.
     */
    private Map<String, Object> buildMetricsMap(KPIMetrics kpi) {
        int total = kpi.getTotalTasks();
        int done  = kpi.getDoneCount();
        double efficiency = total > 0 ? Math.min((done / (double) total) * 100.0, 100.0) : 0.0;

        Map<String, Object> m = new HashMap<>();
        m.put("totalTasks",         total);
        m.put("doneTasks",          done);
        m.put("inProgressTasks",    kpi.getInProgressCount());
        m.put("reviewTasks",        kpi.getReviewCount());
        m.put("readyTasks",         kpi.getReadyCount());
        m.put("backlogTasks",       kpi.getBacklogCount());
        m.put("efficiencyRate",     efficiency);
        m.put("progressPercentage", kpi.getProgressPercentage());
        m.put("estimatedHours",     kpi.getTotalEstimatedHours());
        m.put("realHours",          kpi.getTotalRealHours());
        m.put("timeVariance",       kpi.getTimeVariance());
        return m;
    }

    /** Convert RealHoursByUserDTO list to the generic map format for PDFGeneratorService. */
    private List<Map<String, Object>> toUserHoursMaps(List<RealHoursByUserDTO> raw) {
        return raw.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("username",  u.getUsername());
            m.put("doneTasks", u.getDoneTasks());
            m.put("realHours", u.getRealTotalHours());
            return m;
        }).collect(Collectors.toList());
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
                    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                    .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
                    h1 { color: #2c3e50; text-align: center; }
                    .content { line-height: 1.6; color: #2c3e50; font-size: .95em; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d; font-size: .85em; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>AI-Generated Management Report</h1>
                    <div class="content">
            """ + htmlContent + """
                    </div>
                    <div class="footer">AI-generated report — review for accuracy before distribution.</div>
                </div>
            </body>
            </html>
            """;
    }
}