package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.cloudforge.api.forgetask.service.VectorContextRetriever;
import com.cloudforge.api.forgetask.service.SprintChunkBuilder;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

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
    private final VectorContextRetriever vectorContextRetriever;
    private final SprintChunkBuilder sprintChunkBuilder;

    public ReportGeneratorService(LLMService llmService, KPIService kpiService, VectorContextRetriever vectorContextRetriever,
        SprintChunkBuilder sprintChunkBuilder) {
        this.llmService = llmService;
        this.kpiService = kpiService;
        this.vectorContextRetriever = vectorContextRetriever;
        this.sprintChunkBuilder     = sprintChunkBuilder;
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

    // Reemplazar la construcción del ragContext en buildRagContextBlock()
    // para que sea más directiva sobre cómo usar el contexto:

    private String buildRagContextBlock(Integer sprintId, Integer projectId) {
        if (sprintId == null || projectId == null) return "";
        try {
            String currentChunk = sprintChunkBuilder.buildSprintChunk(sprintId);
            List<String> historicalChunks = vectorContextRetriever
                .retrieveSprintContext(currentChunk, sprintId, projectId);

            if (historicalChunks.isEmpty()) {
                return "\n\nHISTORICAL SPRINT CONTEXT: No previous sprint data available yet.\n";
            }

            StringBuilder sb = new StringBuilder();
            sb.append("\n\nHISTORICAL SPRINT CONTEXT (use this data to make explicit comparisons):\n");
            sb.append("=".repeat(70)).append("\n");
            sb.append("The following are previous sprints from the same project, ordered by relevance.\n");
            sb.append("You MUST reference specific sprint names and metrics when comparing.\n\n");

            for (int i = 0; i < historicalChunks.size(); i++) {
                sb.append("--- Historical Sprint ").append(i + 1).append(" ---\n");
                sb.append(historicalChunks.get(i)).append("\n");
            }

            sb.append("=".repeat(70)).append("\n");
            sb.append("COMPARISON REQUIREMENT: In section 6.2, explicitly compare the current sprint\n");
            sb.append("metrics against the historical sprints above. Mention sprint names, reference\n");
            sb.append("specific numbers, and identify trends across sprints.\n");

            return sb.toString();

        } catch (Exception e) {
            logger.warn("No se pudo recuperar contexto RAG para sprint {}: {}", sprintId, e.getMessage());
            return "";
        }
    }

    /**
     * Build the prompt for AI
     */
    private String buildReportPrompt(String sprintInfo, String tasksSummary,
                                    String kpiAnalysis, String userHoursSummary,
                                    Integer projectId, Integer sprintId) {
        String ragContext = buildRagContextBlock(sprintId, projectId);
        boolean hasHistory = !ragContext.contains("No previous sprint data available");

        String sectionList = hasHistory
            ? """
                Generate exactly these 5 sections with these exact headings:

                Executive Summary
                2-3 plain sentences. State: how many tasks were completed out of total, \
                whether the team finished ahead or behind schedule, and the overall time variance. \
                Write as if explaining results to a non-technical manager seeing this for the first time. \
                Avoid jargon. No filler words like "notable" or "satisfactory".

                Sprint Comparison
                Compare the current sprint against each historical sprint listed above. \
                For EACH historical sprint write exactly ONE sentence in this format:
                "In [exact sprint name], the team estimated [X]h and used [Y]h ([+/-Z]% deviation). \
                In the current sprint, estimated [A]h and used [B]h ([+/-C]% deviation)."
                End with one sentence summarizing the overall trend across sprints in plain language.

                Key Performance Insights
                3-4 bullet points. Each must be a plain-language observation that a manager \
                without technical knowledge can understand. Focus on patterns: \
                Is workload balanced? Did the team improve over time? Are estimates getting better? \
                Do NOT restate numbers already shown in the dashboard.

                Improvement Actions
                3-5 concrete actions. Each must be a single complete sentence. \
                Write as recommendations to the team, not as observations. \
                Use simple, direct language. Example: "Review how tasks are estimated before each sprint \
                to reduce the gap between planned and actual hours."

                Risk Assessment
                2-3 risks. Each on exactly ONE line in this format: \
                "Risk: [plain sentence describing the risk] / Mitigation: [plain sentence describing the action]"
                """
            : """
                Generate exactly these 4 sections with these exact headings:

                Executive Summary
                2-3 plain sentences. State: how many tasks were completed out of total, \
                whether the team finished ahead or behind schedule, and the overall time variance. \
                Write as if explaining results to a non-technical manager seeing this for the first time. \
                Avoid jargon.

                Key Performance Insights
                3-4 bullet points in plain language a non-technical manager can understand. \
                Focus on patterns, not raw numbers.

                Improvement Actions
                3-5 concrete recommendations written as direct actions for the team. \
                Simple, clear sentences.

                Risk Assessment
                2-3 risks. Each on exactly ONE line: \
                "Risk: [sentence] / Mitigation: [sentence]"
                """;

        return """
            You are generating an executive sprint report for senior management and administrators \
            who are NOT technical. They do not know software development terminology. \
            Write everything in plain, professional business language.

            RULES — follow all of them strictly:
            1) Use ONLY the data provided below. Do not invent any numbers or names.
            2) The sprint is CLOSED and FINAL. Do not suggest ongoing actions as if it were open.
            3) Negative time variance means the team finished AHEAD of schedule — always frame this positively.
            4) Do NOT use technical terms: no "backlog grooming", no "velocity", no "sprints" without explanation, \
            no "ISO/IEC", no "capability levels", no "story points".
            5) Never single out a team member negatively.
            6) Each section must use its exact heading. Do not add numbers to headings.
            7) Risk format is mandatory: "Risk: [sentence] / Mitigation: [sentence]" on one line.
            8) Sprint Comparison MUST cite the EXACT sprint name and EXACT hours from the historical data. \
            Never write vague comparisons like "previous sprints showed lower performance".
            9) Key Performance Insights must contain observations a manager can act on, \
            not technical metrics restated in prose.
            10) Write as if this report will be read by someone outside the development team.

            SPRINT DATA:
            """ + sprintInfo + tasksSummary + kpiAnalysis + userHoursSummary + ragContext
            + "\n\n" + sectionList;
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