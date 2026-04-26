package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.service.ManagementReportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * REST controller that exposes the AI-generated management report endpoint.
 * Used by the web application to display sprint analysis and recommendations.
 */
@RestController
@RequestMapping("/api/ai")
public class ManagementReportController {

    private final ManagementReportService managementReportService;

    public ManagementReportController(ManagementReportService managementReportService) {
        this.managementReportService = managementReportService;
    }

    /**
     * Generates an AI management report for a project.
     * GET /api/ai/report?projectId={id}
     *
     * @param projectId the project ID to generate the report for
     * @return JSON object with the generated report text
     */
    @GetMapping("/report")
    public ResponseEntity<Map<String, String>> getManagementReport(
            @RequestParam(defaultValue = "1") Integer projectId
    ) {
        try {
            String report = managementReportService.generateReport(projectId);
            return ResponseEntity.ok(Map.of("report", report, "projectId", String.valueOf(projectId)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate management report."));
        }
    }
}
