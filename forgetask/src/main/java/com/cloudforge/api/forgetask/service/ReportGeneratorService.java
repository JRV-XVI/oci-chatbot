package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Service to generate report content
 * Collects data from various sources (KPI, metrics, tasks) and creates report text
 */
@Service
public class ReportGeneratorService {
    private static final Logger logger = LoggerFactory.getLogger(ReportGeneratorService.class);
    private final LLMService llmService;
    private final KPIService kpiService;

    public ReportGeneratorService(LLMService llmService, KPIService kpiService) {
        this.llmService = llmService;
        this.kpiService = kpiService;
    }

    /**
     * Generate AI-powered management report for a sprint
     */
    public String generateManagementReport(Integer projectId, Integer sprintId, List<TaskDTO> tasks) throws Exception {
        return generateManagementReport(projectId, sprintId, tasks, List.of());
    }

    /**
     * Generate AI-powered management report for a sprint with per-user metrics.
     */
    public String generateManagementReport(
        Integer projectId,
        Integer sprintId,
        List<TaskDTO> tasks,
        List<Map<String, Object>> userHours
    ) throws Exception {
        try {
            // Collect data
            String sprintInfo = buildSprintInfo(sprintId);
            String tasksSummary = buildTasksSummary(tasks);
            String kpiAnalysis = buildKPIAnalysis(tasks);
            String userHoursSummary = buildUserHoursSummary(userHours);
            
            // Build prompt for LLM
            String prompt = buildReportPrompt(sprintInfo, tasksSummary, kpiAnalysis, userHoursSummary, projectId, sprintId);
            
            // Generate AI-powered content
            logger.info("Generating AI report for Project: {}, Sprint: {}", projectId, sprintId);
            String aiContent;
            try {
                aiContent = llmService.generateText(prompt);
            } catch (Exception llmError) {
                logger.warn("LLM generation failed; generating report without AI. Reason: {}", llmError.getMessage());
                aiContent = "AI generation is currently unavailable (model not accessible or provider error).\n\n" +
                    "Fallback Recommendations:\n" +
                    "- Validate sprint scope and rebalance tasks in-progress vs backlog.\n" +
                    "- Review blockers for tasks stuck in review/in-progress and assign owners.\n" +
                    "- Re-estimate remaining work and adjust capacity for the next sprint.\n" +
                    "- Track time variance and address recurring estimation gaps.";
            }
            
            // Build final report with structure
            return buildFormattedReport(sprintInfo, tasksSummary, kpiAnalysis, aiContent);
        } catch (Exception e) {
            logger.error("Error generating management report: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Build sprint information section
     */
    private String buildSprintInfo(Integer sprintId) {
        StringBuilder sb = new StringBuilder();
        sb.append("SPRINT INFORMATION\n");
        sb.append("==================\n");
        
        if (sprintId != null) {
            sb.append("Sprint ID: ").append(sprintId).append("\n");
        } else {
            sb.append("Sprint: All sprints (Current)\n");
        }
        
        sb.append("Report Generated: ")
        .append(ZonedDateTime.now(ZoneId.of("America/Mexico_City"))
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .append("\n\n");
        return sb.toString();
    }

    /**
     * Build tasks summary
     */
    private String buildTasksSummary(List<TaskDTO> tasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("TASKS SUMMARY\n");
        sb.append("=============\n");
        
        if (tasks == null || tasks.isEmpty()) {
            sb.append("No tasks found.\n\n");
            return sb.toString();
        }

        sb.append("Total Tasks: ").append(tasks.size()).append("\n");
        
        // Count by status
        long done = tasks.stream().filter(t -> "done".equalsIgnoreCase(t.getStatus())).count();
        long inProgress = tasks.stream().filter(t -> "in_progress".equalsIgnoreCase(t.getStatus())).count();
        long review = tasks.stream().filter(t -> "review".equalsIgnoreCase(t.getStatus())).count();
        long ready = tasks.stream().filter(t -> "ready".equalsIgnoreCase(t.getStatus())).count();
        long backlog = tasks.stream().filter(t -> "backlog".equalsIgnoreCase(t.getStatus())).count();
        
        sb.append("  - Done: ").append(done).append("\n");
        sb.append("  - In Progress: ").append(inProgress).append("\n");
        sb.append("  - Review: ").append(review).append("\n");
        sb.append("  - Ready: ").append(ready).append("\n");
        sb.append("  - Backlog: ").append(backlog).append("\n\n");
        
        return sb.toString();
    }

    /**
     * Build KPI analysis
     */
    private String buildKPIAnalysis(List<TaskDTO> tasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("KPI METRICS\n");
        sb.append("===========\n");
        
        if (tasks == null || tasks.isEmpty()) {
            sb.append("Insufficient data for KPI calculation.\n\n");
            return sb.toString();
        }

        try {
            KPIMetrics metrics = kpiService.calculateKPIs(tasks);
            if (metrics != null) {
                // Calculate efficiency: done tasks / total tasks
                double efficiency = metrics.getTotalTasks() > 0 ? (double) metrics.getDoneCount() / metrics.getTotalTasks() : 0;
                sb.append("Efficiency Rate: ").append(String.format(Locale.US, "%.1f%%", efficiency * 100)).append("\n");
                
                // Current progress
                sb.append("Progress: ").append(metrics.getProgressPercentage()).append("%\n");
                
                // Task distribution
                sb.append("Task Distribution:\n");
                sb.append("  - Done: ").append(metrics.getDoneCount()).append("\n");
                sb.append("  - In Progress: ").append(metrics.getInProgressCount()).append("\n");
                sb.append("  - Review: ").append(metrics.getReviewCount()).append("\n");
                sb.append("  - Ready: ").append(metrics.getReadyCount()).append("\n");
                sb.append("  - Backlog: ").append(metrics.getBacklogCount()).append("\n");
                
                // Time metrics
                if (metrics.getTotalEstimatedHours() > 0) {
                    double timeVariance = metrics.getTimeVariance();
                    sb.append("Time Variance: ").append(String.format("%.2f hours", timeVariance)).append("\n");
                    sb.append("Total Estimated Time: ").append(String.format("%.1f hours", metrics.getTotalEstimatedHours())).append("\n");
                    sb.append("Total Actual Time: ").append(String.format("%.1f hours", metrics.getTotalRealHours())).append("\n");
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to calculate KPI metrics: {}", e.getMessage());
            sb.append("KPI data unavailable at this time.\n");
        }
        
        sb.append("\n");
        return sb.toString();
    }

    private String buildUserHoursSummary(List<Map<String, Object>> userHours) {
        if (userHours == null || userHours.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("TEAM MEMBER METRICS\n");
        sb.append("===================\n");
        for (Map<String, Object> row : userHours) {
            if (row == null) {
                continue;
            }
            String displayName = String.valueOf(row.getOrDefault("displayName", row.getOrDefault("username", "-")));
            int doneTasks = intFrom(row.get("doneTasks"));
            double realHours = doubleFrom(row.get("realHours"));
            sb.append("- ")
              .append(displayName)
              .append(": Tasks Done=")
              .append(doneTasks)
              .append(", Real Hours=")
              .append(String.format(Locale.US, "%.1f", realHours))
              .append("\n");
        }
        sb.append("\n");
        return sb.toString();
    }

    /**
     * Build the prompt for AI
     */
    private String buildReportPrompt(String sprintInfo, String tasksSummary,
                                    String kpiAnalysis, String userHoursSummary,
                                    Integer projectId, Integer sprintId) {
        return """
            You are a professional project manager generating an executive management report.

            CRITICAL RULES:
            1) Use ONLY the data provided. Do not invent numbers, usernames, or metrics not present below.
            2) The sprint state is FINAL. Treat it as closed.
            3) Negative time variance = team finished AHEAD of schedule. Never interpret as underutilization.
            4) Do NOT mention ISO/IEC standards or capability frameworks.
            5) Do NOT use filler phrases unless directly supported by data.
            6) Risk statements must be internally consistent. Never flag both underutilization and overload simultaneously.
            7) Do not claim all tasks are done unless Done equals Total Tasks.
            8) Higher-complexity work is indicated ONLY when a member has FEWER tasks AND MORE hours than peers. Never flag a member negatively for having fewer tasks.
            9) Each Key Performance Insight must be a distinct observation. Do not restate the same metric twice.
            10) FORMATTING: Every list item must be a complete sentence on ONE line. Never put a number alone on its line.
            11) FORMATTING: Every risk item MUST start with "Risk:" and follow this exact single-line pattern:
                Risk: [one sentence describing the risk] / Mitigation: [one sentence describing the action]
                NEVER write "Risk:" twice in one item.
                NEVER start a risk item without the word "Risk:".
                NEVER split Risk and Mitigation across separate lines.
            12) Key Performance Insights must focus on TEAM-LEVEL patterns. Never single out individuals negatively.
            13) Key Performance Insights must derive conclusions NOT directly readable from the dashboard.

            SPRINT DATA:
            """ + sprintInfo + tasksSummary + kpiAnalysis + userHoursSummary + """

            Generate exactly these 4 sections using these exact headings (no numbers, no extra formatting):

            Executive Summary
            2-3 sentences: efficiency rate, tasks completed (X of Y), time variance interpretation. No filler conclusions like "satisfactory" or "good indicator".

            Key Performance Insights
            3-4 bullet points. Each must be an analytical observation derived from ratios or patterns in the data, not a restatement of dashboard numbers.

            Improvement Actions
            3-5 items. Each on a single complete line. Address: backlog root cause, estimation accuracy, workload distribution by hours-to-tasks ratio.

            Risk Assessment
            2-3 risks. Each on exactly ONE line starting with "Risk:" in this format: "Risk: [description] / Mitigation: [action]"

            Use these exact section headings without numbers or extra formatting.
            """;
    }

    private int intFrom(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private double doubleFrom(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text) {
            try {
                return Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return 0d;
            }
        }
        return 0d;
    }

    /**
     * Build the final formatted report
     */
    private String buildFormattedReport(String sprintInfo, String tasksSummary, String kpiAnalysis, String aiContent) {
        StringBuilder report = new StringBuilder();
        
        report.append("==============================================================\n");
        report.append("               AI-GENERATED MANAGEMENT REPORT\n");
        report.append("==============================================================\n\n");
        
        report.append(sprintInfo);
        report.append(tasksSummary);
        report.append(kpiAnalysis);
        
        report.append("AI-GENERATED INSIGHTS\n");
        report.append("=====================\n");
        report.append(aiContent).append("\n\n");
        
        report.append("==============================================================\n");
        report.append("End of Report - Generated at ")
            .append(ZonedDateTime.now(ZoneId.of("America/Mexico_City"))
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
            .append("\n");
        report.append("==============================================================\n");
        
        return report.toString();
    }
}