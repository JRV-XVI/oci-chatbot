package com.cloudforge.api.forgetask.dto;

public record ProjectKpisSummaryDTO(

    // ── KPI 1: TotalTasksKpi ──
    int totalTasks,
    int tasksBacklog,
    int tasksReady,
    int tasksInProgress,
    int tasksReview,
    int tasksDone,

    // ── KPI 2: TotalHoursKpi ──
    double realHours,       // PROJECT.REAL_TIME
    double estimatedHours,  // PROJECT.ESTIMATED_TIME

    // ── KPI 3 y 4 compartidos ──
    int totalDevs,          // users con ROLE = 'developer' en el proyecto

    // ── KPI 3: AvgTasksKpi ──
    double avgTasksPerDev,
    int sprintTasks,
    int sprintDevs,

    // ── KPI 4: AvgHoursDevKpi ──
    double avgHoursPerDev,
    double expectedHoursPerDev, // estimatedHours / totalDevs
    double sprintRealHours,
    double sprintEstimatedHours
) {}
