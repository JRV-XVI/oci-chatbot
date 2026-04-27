package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

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
        try {
            // Collect data
            String sprintInfo = buildSprintInfo(sprintId);
            String tasksSummary = buildTasksSummary(tasks);
            String kpiAnalysis = buildKPIAnalysis(tasks);
            
            // Build prompt for LLM
            String prompt = buildReportPrompt(sprintInfo, tasksSummary, kpiAnalysis, projectId, sprintId);
            
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
        
        sb.append("Report Generated: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))).append("\n\n");
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
                sb.append("Efficiency Rate: ").append(String.format("%.2f%%", efficiency * 100)).append("\n");
                
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

    /**
     * Build the prompt for AI
     */
    private String buildReportPrompt(String sprintInfo, String tasksSummary, String kpiAnalysis, 
                                     Integer projectId, Integer sprintId) {
        return """
            You are a professional project manager generating an executive management report.
            
            Based on the following sprint data, provide:
            1. Executive Summary (2-3 sentences)
            2. Key Performance Insights (3-4 bullet points)
            3. Improvement Actions & Recommendations (3-5 actionable items)
            4. Risk Assessment & Mitigation Strategies
            
            SPRINT DATA:
            """ + sprintInfo + tasksSummary + kpiAnalysis + """
            
            Generate a professional, actionable report in clear English with proper formatting.
            Focus on actionable insights and strategic recommendations for team improvement.
            """;
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
            .append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
            .append("\n");
        report.append("==============================================================\n");
        
        return report.toString();
    }
}