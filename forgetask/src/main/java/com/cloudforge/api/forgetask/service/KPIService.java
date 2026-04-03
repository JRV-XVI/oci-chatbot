package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.KPIMetrics;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for calculating KPI metrics from tasks
 * This service is designed to work with any data source (hardcoded, database, etc.)
 * All calculations are based on task status, estimated hours, and real hours
 */
@Service
public class KPIService {

    /**
     * Calculate KPI metrics from a list of tasks
     * @param tasks List of tasks to calculate KPIs from
     * @param expectedTaskCounts Map of status to expected task count (optional for overload detection)
     * @return KPIMetrics object with all calculated KPIs
     */
    public KPIMetrics calculateKPIs(List<TaskDTO> tasks, Map<String, Integer> expectedTaskCounts) {
        KPIMetrics metrics = new KPIMetrics();

        if (tasks == null || tasks.isEmpty()) {
            return metrics;
        }

        // Initialize counts and sums
        int backlogCount = 0;
        int readyCount = 0;
        int inProgressCount = 0;
        int reviewCount = 0;
        int doneCount = 0;
        double totalEstimatedHours = 0.0;
        double totalRealHours = 0.0;
        double completedEstimatedHours = 0.0;

        // Process each task
        for (TaskDTO task : tasks) {
            String status = task.getStatus();
            double estimatedTime = task.getEstimatedTime();
            double realTime = task.getRealTime();

            // Count by status
            if ("backlog".equalsIgnoreCase(status)) {
                backlogCount++;
            } else if ("ready".equalsIgnoreCase(status)) {
                readyCount++;
            } else if ("in-progress".equalsIgnoreCase(status)) {
                inProgressCount++;
            } else if ("review".equalsIgnoreCase(status)) {
                reviewCount++;
            } else if ("done".equalsIgnoreCase(status)) {
                doneCount++;
                completedEstimatedHours += estimatedTime;
            }

            // Sum hours
            totalEstimatedHours += estimatedTime;
            totalRealHours += realTime;
        }

        // Set basic counts
        metrics.setTotalTasks(tasks.size());
        metrics.setCompletedTasks(doneCount);
        metrics.setBacklogCount(backlogCount);
        metrics.setReadyCount(readyCount);
        metrics.setInProgressCount(inProgressCount);
        metrics.setReviewCount(reviewCount);
        metrics.setDoneCount(doneCount);

        // Set time metrics
        metrics.setTotalEstimatedHours(totalEstimatedHours);
        metrics.setTotalRealHours(totalRealHours);
        metrics.setCompletedEstimatedHours(completedEstimatedHours);
        metrics.setTimeVariance(totalRealHours - totalEstimatedHours);

        // Calculate progress percentage
        int progressPercentage = totalEstimatedHours > 0
                ? Math.round((float) (completedEstimatedHours / totalEstimatedHours) * 100)
                : 0;
        metrics.setProgressPercentage(progressPercentage);

        // Detect overloaded columns based on expected counts
        if (expectedTaskCounts != null && !expectedTaskCounts.isEmpty()) {
            metrics.setBacklogOverloaded(backlogCount > expectedTaskCounts.getOrDefault("backlog", Integer.MAX_VALUE));
            metrics.setReadyOverloaded(readyCount > expectedTaskCounts.getOrDefault("ready", Integer.MAX_VALUE));
            metrics.setInProgressOverloaded(inProgressCount > expectedTaskCounts.getOrDefault("in-progress", Integer.MAX_VALUE));
            metrics.setReviewOverloaded(reviewCount > expectedTaskCounts.getOrDefault("review", Integer.MAX_VALUE));
            metrics.setDoneOverloaded(doneCount > expectedTaskCounts.getOrDefault("done", Integer.MAX_VALUE));
        }

        return metrics;
    }

    /**
     * Simplified version - calculate KPIs without overload detection
     * @param tasks List of tasks to calculate KPIs from
     * @return KPIMetrics object with all calculated KPIs
     */
    public KPIMetrics calculateKPIs(List<TaskDTO> tasks) {
        return calculateKPIs(tasks, new HashMap<>());
    }

    /**
     * Calculate task distribution by status
     * @param tasks List of tasks
     * @return Map with status as key and count as value
     */
    public Map<String, Integer> getTaskDistributionByStatus(List<TaskDTO> tasks) {
        Map<String, Integer> distribution = new HashMap<>();
        distribution.put("backlog", 0);
        distribution.put("ready", 0);
        distribution.put("in-progress", 0);
        distribution.put("review", 0);
        distribution.put("done", 0);

        if (tasks == null || tasks.isEmpty()) {
            return distribution;
        }

        for (TaskDTO task : tasks) {
            String status = task.getStatus();
            distribution.put(status, distribution.getOrDefault(status, 0) + 1);
        }

        return distribution;
    }

    /**
     * Calculate time-based metrics summary
     * @param tasks List of tasks
     * @return Map with time metrics
     */
    public Map<String, Double> getTimeMetricsSummary(List<TaskDTO> tasks) {
        Map<String, Double> summary = new HashMap<>();
        summary.put("totalEstimatedHours", 0.0);
        summary.put("totalRealHours", 0.0);
        summary.put("variance", 0.0);

        if (tasks == null || tasks.isEmpty()) {
            return summary;
        }

        double totalEstimated = 0.0;
        double totalReal = 0.0;

        for (TaskDTO task : tasks) {
            totalEstimated += task.getEstimatedTime();
            totalReal += task.getRealTime();
        }

        summary.put("totalEstimatedHours", totalEstimated);
        summary.put("totalRealHours", totalReal);
        summary.put("variance", totalReal - totalEstimated);

        return summary;
    }
}