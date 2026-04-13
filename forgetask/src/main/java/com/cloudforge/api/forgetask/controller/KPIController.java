package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.KPIMetrics;
import com.cloudforge.api.forgetask.dto.RealHoursBySprintUserDTO;
import com.cloudforge.api.forgetask.dto.RealHoursByUserDTO;
import com.cloudforge.api.forgetask.dto.RealHoursTaskDetailDTO;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import com.cloudforge.api.forgetask.service.KPIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.cloudforge.api.forgetask.dto.ProjectKpisSummaryDTO;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for KPI calculations
 * Provides endpoints to calculate and retrieve KPI metrics from a list of tasks
 * This is designed to be flexible and work with both hardcoded and database data
 */
@RestController
@RequestMapping("/api/kpi")
public class KPIController {
    
    @Autowired
    private KPIService kpiService;

    /**
     * Calculate KPI metrics from a list of tasks
     * POST /api/kpi/calculate
     * 
     * @param request Request containing tasks and optional expected task counts
     * @return KPIMetrics with all calculated indicators
     */
    @PostMapping("/calculate")
    public ResponseEntity<KPIMetrics> calculateKPIs(@RequestBody KPICalculationRequest request) {
        try {
            if (request.getTasks() == null || request.getTasks().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            KPIMetrics metrics = kpiService.calculateKPIs(request.getTasks(), request.getExpectedTaskCounts());
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Calculate KPI metrics from tasks without overload detection
     * POST /api/kpi/calculate-simple
     * 
     * @param tasks List of tasks to calculate KPIs from
     * @return KPIMetrics with all calculated indicators
     */
    @PostMapping("/calculate-simple")
    public ResponseEntity<KPIMetrics> calculateKPIsSimple(@RequestBody List<TaskDTO> tasks) {
        try {
            if (tasks == null || tasks.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            KPIMetrics metrics = kpiService.calculateKPIs(tasks);
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get task distribution by status
     * POST /api/kpi/distribution
     * 
     * @param tasks List of tasks
     * @return Map with status distribution counts
     */
    @PostMapping("/distribution")
    public ResponseEntity<Map<String, Integer>> getTaskDistribution(@RequestBody List<TaskDTO> tasks) {
        try {
            if (tasks == null || tasks.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            Map<String, Integer> distribution = kpiService.getTaskDistributionByStatus(tasks);
            return ResponseEntity.ok(distribution);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get time metrics summary
     * POST /api/kpi/time-summary
     * 
     * @param tasks List of tasks
     * @return Map with time metrics (estimated, real, variance)
     */
    @PostMapping("/time-summary")
    public ResponseEntity<Map<String, Double>> getTimeSummary(@RequestBody List<TaskDTO> tasks) {
        try {
            if (tasks == null || tasks.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            Map<String, Double> summary = kpiService.getTimeMetricsSummary(tasks);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get users with tasks and their done metrics aggregated by user.
     * GET /api/kpi/real-hours-by-user?sprintId=1
     *
     * @param sprintId Optional sprint ID filter.
     * @return Aggregated KPI rows by username.
     */
    @GetMapping("/real-hours-by-user")
    public ResponseEntity<List<RealHoursByUserDTO>> getRealHoursByUser(
            @RequestParam(required = false) Integer sprintId
    ) {
        try {
            List<RealHoursByUserDTO> rows = kpiService.getRealHoursByUser(sprintId);
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get done tasks for one user used by KPI drill-down.
     * GET /api/kpi/real-hours-by-user/tasks?username=jane&sprintId=1
     *
     * @param username Required username.
     * @param sprintId Optional sprint filter.
     * @return Task rows with title and real time.
     */
    @GetMapping("/real-hours-by-user/tasks")
    public ResponseEntity<List<RealHoursTaskDetailDTO>> getRealHoursTasksByUser(
            @RequestParam String username,
            @RequestParam(required = false) Integer sprintId
    ) {
        try {
            if (username == null || username.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            List<RealHoursTaskDetailDTO> rows = kpiService.getRealHoursTasksByUser(username, sprintId);
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get general KPI rows where topic is sprint and group is user.
     * GET /api/kpi/real-hours-by-sprint-user?sprintId=1
     *
     * @param sprintId Optional sprint filter.
     * @return KPI rows by sprint and user.
     */
    @GetMapping("/real-hours-by-sprint-user")
    public ResponseEntity<List<RealHoursBySprintUserDTO>> getRealHoursBySprintUser(
            @RequestParam(required = false) Integer sprintId
    ) {
        try {
            List<RealHoursBySprintUserDTO> rows = kpiService.getRealHoursBySprintUser(sprintId);
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Health check endpoint for KPI service
     * GET /api/kpi/health
     * 
     * @return Status message
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "KPI service is running");
        response.put("version", "1.0.0");
        return ResponseEntity.ok(response);
    }

    /**
     * Request object for KPI calculations
     * Contains tasks and optional expected task counts per status
     */
    public static class KPICalculationRequest {
        private List<TaskDTO> tasks;
        private Map<String, Integer> expectedTaskCounts;

        public KPICalculationRequest() {
        }

        public KPICalculationRequest(List<TaskDTO> tasks, Map<String, Integer> expectedTaskCounts) {
            this.tasks = tasks;
            this.expectedTaskCounts = expectedTaskCounts;
        }

        public List<TaskDTO> getTasks() {
            return tasks;
        }

        public void setTasks(List<TaskDTO> tasks) {
            this.tasks = tasks;
        }

        public Map<String, Integer> getExpectedTaskCounts() {
            return expectedTaskCounts;
        }

        public void setExpectedTaskCounts(Map<String, Integer> expectedTaskCounts) {
            this.expectedTaskCounts = expectedTaskCounts;
        }
    }

    @GetMapping("/project/{projectId}/summary")
    public ResponseEntity<ProjectKpisSummaryDTO> getProjectKpisSummary(
        @PathVariable Integer projectId
    ) {
        try {
            ProjectKpisSummaryDTO summary = kpiService.getProjectKpisSummary(projectId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

}