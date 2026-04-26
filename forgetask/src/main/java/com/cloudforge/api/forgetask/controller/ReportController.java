package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.TaskDTO;
import com.cloudforge.api.forgetask.service.LLMService;
import com.cloudforge.api.forgetask.service.PDFGeneratorService;
import com.cloudforge.api.forgetask.service.ReportGeneratorService;
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

/**
 * REST Controller for AI-generated management reports
 * Endpoints for generating and downloading PDF reports
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private static final Logger logger = LoggerFactory.getLogger(ReportController.class);

    private final ReportGeneratorService reportGeneratorService;
    private final PDFGeneratorService pdfGeneratorService;
    private final LLMService llmService;
    private final TaskController taskController;

    public ReportController(
        ReportGeneratorService reportGeneratorService,
        PDFGeneratorService pdfGeneratorService,
        LLMService llmService,
        TaskController taskController
    ) {
        this.reportGeneratorService = reportGeneratorService;
        this.pdfGeneratorService = pdfGeneratorService;
        this.llmService = llmService;
        this.taskController = taskController;
    }

    /**
     * Health check for report service
     * GET /api/reports/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("service", "report-api");
        response.put("llm_configured", llmService.isConfigured());
        return ResponseEntity.ok(response);
    }

    /**
     * Generate and download PDF report for a sprint
     * GET /api/reports/generate/pdf?projectId=1&sprintId=1
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

            // Get tasks (use existing TaskController endpoint)
            ResponseEntity<List<TaskDTO>> tasksResponse = taskController.getAllTasks();
            List<TaskDTO> tasks = tasksResponse.getBody();

            if (tasks == null || tasks.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "No tasks found for generating report"));
            }

            // Generate report content
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);

            // Generate PDF
            byte[] pdfBytes = pdfGeneratorService.generatePDF(reportContent, projectId, sprintId);

            // Generate filename
            String filename = pdfGeneratorService.generateFilename(projectId, sprintId);

            // Return PDF file
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

    /**
     * Generate and return report as plain text (fallback)
     * GET /api/reports/generate/text?projectId=1&sprintId=1
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

            // Get tasks
            ResponseEntity<List<TaskDTO>> tasksResponse = taskController.getAllTasks();
            List<TaskDTO> tasks = tasksResponse.getBody();

            if (tasks == null || tasks.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "No tasks found for generating report"));
            }

            // Generate report content
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);

            Map<String, Object> response = new HashMap<>();
            response.put("content", reportContent);
            response.put("projectId", projectId);
            response.put("sprintId", sprintId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error generating text report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    /**
     * Generate report as HTML for web rendering
     * GET /api/reports/generate/html?projectId=1&sprintId=1
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

            // Get tasks
            ResponseEntity<List<TaskDTO>> tasksResponse = taskController.getAllTasks();
            List<TaskDTO> tasks = tasksResponse.getBody();

            if (tasks == null || tasks.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "No tasks found for generating report"));
            }

            // Generate report content
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);

            // Convert to HTML
            String htmlContent = convertToHTML(reportContent);

            return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(htmlContent);

        } catch (Exception e) {
            logger.error("Error generating HTML report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to generate report: " + e.getMessage()));
        }
    }

    /**
     * Convert plain text report to HTML format
     */
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
