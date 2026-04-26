package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.ProjectKpisSummaryDTO;
import com.cloudforge.api.forgetask.dto.RealHoursBySprintUserDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service that generates AI-powered management reports by aggregating KPI data
 * and sending a structured prompt to the DeepSeek LLM.
 */
@Service
public class ManagementReportService {

    private static final Logger logger = LoggerFactory.getLogger(ManagementReportService.class);

    private final KPIService kpiService;
    private final DeepSeekService deepSeekService;

    public ManagementReportService(KPIService kpiService, DeepSeekService deepSeekService) {
        this.kpiService = kpiService;
        this.deepSeekService = deepSeekService;
    }

    /**
     * Generates an AI management report for the given project.
     * Aggregates KPI data and sprint performance, then asks the LLM for analysis
     * and improvement recommendations.
     *
     * @param projectId the project ID to generate the report for
     * @return AI-generated management report text
     */
    public String generateReport(Integer projectId) {
        try {
            ProjectKpisSummaryDTO kpis = kpiService.getProjectKpisSummary(projectId);
            List<RealHoursBySprintUserDTO> sprintData = kpiService.getRealHoursBySprintUserForProject(projectId);

            String prompt = buildReportPrompt(projectId, kpis, sprintData);
            return deepSeekService.generateText(prompt);

        } catch (Exception e) {
            logger.error("Error generating management report for project {}", projectId, e);
            return "Could not generate the management report. Please verify project data and try again.";
        }
    }

    /**
     * Builds the structured prompt sent to the LLM with all KPI context.
     */
    private String buildReportPrompt(Integer projectId, ProjectKpisSummaryDTO kpis,
                                     List<RealHoursBySprintUserDTO> sprintData) {
        StringBuilder sb = new StringBuilder();

        sb.append("You are a professional project management consultant. ")
          .append("Based on the following sprint KPI data, provide a concise executive management report. ")
          .append("Include: 1) Sprint status summary, 2) Team performance highlights, ")
          .append("3) Risk areas, 4) Specific improvement recommendations. ")
          .append("Keep the response under 400 words and use bullet points.\n\n");

        sb.append("PROJECT ID: ").append(projectId).append("\n\n");

        sb.append("=== CURRENT SPRINT KPIs ===\n");
        sb.append("Total tasks: ").append(kpis.totalTasks()).append("\n");
        sb.append("  - Backlog: ").append(kpis.tasksBacklog()).append("\n");
        sb.append("  - Ready: ").append(kpis.tasksReady()).append("\n");
        sb.append("  - In Progress: ").append(kpis.tasksInProgress()).append("\n");
        sb.append("  - In Review: ").append(kpis.tasksReview()).append("\n");
        sb.append("  - Done: ").append(kpis.tasksDone()).append("\n");

        if (kpis.totalTasks() > 0) {
            int completionPct = (int) Math.round((double) kpis.tasksDone() / kpis.totalTasks() * 100);
            sb.append("Overall completion: ").append(completionPct).append("%\n");
        }

        sb.append("\nHours — Real: ").append(kpis.realHours())
          .append(" hrs | Estimated: ").append(kpis.estimatedHours()).append(" hrs");
        if (kpis.estimatedHours() > 0) {
            double efficiency = kpis.realHours() / kpis.estimatedHours() * 100;
            sb.append(String.format(" (%.1f%% consumed)", efficiency));
        }
        sb.append("\n");

        sb.append("Team size (developers): ").append(kpis.totalDevs()).append("\n");
        sb.append("Avg tasks per developer: ").append(kpis.avgTasksPerDev()).append("\n");
        sb.append("Avg hours per developer: ").append(kpis.avgHoursPerDev())
          .append(" / expected ").append(kpis.expectedHoursPerDev()).append(" hrs\n");

        sb.append("Active sprint tasks: ").append(kpis.sprintTasks()).append("\n");
        sb.append("Active sprint hours — Real: ").append(kpis.sprintRealHours())
          .append(" / Estimated: ").append(kpis.sprintEstimatedHours()).append("\n");

        if (sprintData != null && !sprintData.isEmpty()) {
            sb.append("\n=== PERFORMANCE BY SPRINT AND USER ===\n");

            Map<String, List<RealHoursBySprintUserDTO>> bySprint = sprintData.stream()
                    .collect(Collectors.groupingBy(RealHoursBySprintUserDTO::getSprintTitle));

            bySprint.forEach((sprintTitle, users) -> {
                sb.append("Sprint: ").append(sprintTitle).append("\n");
                users.forEach(u ->
                    sb.append("  ").append(u.getUsername())
                      .append(" — ").append(u.getDoneTasks()).append(" tasks done")
                      .append(", ").append(u.getRealTotalHours()).append(" real hrs\n")
                );
            });
        }

        return sb.toString();
    }
}
