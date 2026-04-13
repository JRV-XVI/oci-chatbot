package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.KPIMetrics;
import com.cloudforge.api.forgetask.dto.ProjectKpisSummaryDTO;
import com.cloudforge.api.forgetask.dto.RealHoursByUserDTO;
import com.cloudforge.api.forgetask.dto.RealHoursBySprintUserDTO;
import com.cloudforge.api.forgetask.dto.RealHoursTaskDetailDTO;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.springframework.jdbc.core.JdbcTemplate;
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

    private final JdbcTemplate jdbcTemplate;

    public KPIService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

        /**
         * Aggregate users that have tasks and compute done metrics by username.
         * If sprintId is provided, results are scoped to that sprint only.
         */
    public List<RealHoursByUserDTO> getRealHoursByUser(Integer sprintId) {
        String baseSql = """
                SELECT NVL(ua.USERNAME, 'Sin asignar') AS USERNAME,
                  NVL(SUM(CASE WHEN LOWER(NVL(ts.STATE, '')) = 'done' THEN NVL(t.REAL_TIME, 0) ELSE 0 END), 0) AS REAL_TOTAL_HOURS,
                  NVL(SUM(CASE WHEN LOWER(NVL(ts.STATE, '')) = 'done' THEN 1 ELSE 0 END), 0) AS DONE_TASKS
                FROM TASK t
                LEFT JOIN USER_ACCOUNT ua ON ua.ID_USER = t.ID_USER AND ua.ID_PROJECT = t.ID_PROJECT
                LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
              WHERE 1 = 1
                """;

        String orderAndGroup = """
                GROUP BY NVL(ua.USERNAME, 'Sin asignar')
                ORDER BY REAL_TOTAL_HOURS DESC, USERNAME ASC
                """;

        String sql;
        Object[] params;
        if (sprintId != null) {
            sql = baseSql + " AND t.ID_SPRINT = ? " + orderAndGroup;
            params = new Object[] { sprintId };
        } else {
            sql = baseSql + orderAndGroup;
            params = new Object[] {};
        }

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new RealHoursByUserDTO(
                        rs.getString("USERNAME"),
                        rs.getDouble("REAL_TOTAL_HOURS"),
                        rs.getInt("DONE_TASKS")
                ),
                params
        );
    }

    /**
     * Return done hours and done tasks grouped by sprint and user.
     * If sprintId is provided, rows are limited to that sprint.
     */
    public List<RealHoursBySprintUserDTO> getRealHoursBySprintUser(Integer sprintId) {
        String baseSql = """
                SELECT s.ID_SPRINT,
                       COALESCE(
                           CASE
                               WHEN REGEXP_LIKE(s.TITLE, 'Sprint\\s*#\\s*[0-9]+', 'i')
                                   THEN TO_NUMBER(REGEXP_SUBSTR(s.TITLE, 'Sprint\\s*#\\s*([0-9]+)', 1, 1, NULL, 1))
                               ELSE NULL
                           END,
                           s.ID_SPRINT
                       ) AS SPRINT_NUMBER,
                       s.TITLE AS SPRINT_TITLE,
                       NVL(ua.USERNAME, 'Sin asignar') AS USERNAME,
                       NVL(SUM(CASE WHEN LOWER(NVL(ts.STATE, '')) = 'done' THEN NVL(t.REAL_TIME, 0) ELSE 0 END), 0) AS REAL_TOTAL_HOURS,
                       NVL(SUM(CASE WHEN LOWER(NVL(ts.STATE, '')) = 'done' THEN 1 ELSE 0 END), 0) AS DONE_TASKS
                FROM TASK t
                LEFT JOIN USER_ACCOUNT ua ON ua.ID_USER = t.ID_USER AND ua.ID_PROJECT = t.ID_PROJECT
                LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
                LEFT JOIN SPRINT s ON s.ID_SPRINT = t.ID_SPRINT
                WHERE t.ID_SPRINT IS NOT NULL
                """;

        String sprintFilter = sprintId != null ? " AND t.ID_SPRINT = ? " : "";
        String groupAndOrder = " GROUP BY s.ID_SPRINT, s.TITLE, NVL(ua.USERNAME, 'Sin asignar') ORDER BY SPRINT_NUMBER, s.ID_SPRINT, USERNAME ";

        String sql = baseSql + sprintFilter + groupAndOrder;

        Object[] params = sprintId != null ? new Object[] { sprintId } : new Object[] {};

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new RealHoursBySprintUserDTO(
                        rs.getInt("ID_SPRINT"),
                        rs.getInt("SPRINT_NUMBER"),
                        rs.getString("SPRINT_TITLE"),
                        rs.getString("USERNAME"),
                        rs.getDouble("REAL_TOTAL_HOURS"),
                        rs.getInt("DONE_TASKS")
                ),
                params
        );
    }

    /**
     * Return done tasks (title + real time) for one user.
     * If sprintId is provided, rows are limited to that sprint.
     */
    public List<RealHoursTaskDetailDTO> getRealHoursTasksByUser(String username, Integer sprintId) {
        String baseSql = """
                SELECT TO_CHAR(t.ID_TASK) AS TASK_ID,
                       t.TITLE,
                       NVL(t.REAL_TIME, 0) AS REAL_TIME
                FROM TASK t
                LEFT JOIN USER_ACCOUNT ua ON ua.ID_USER = t.ID_USER AND ua.ID_PROJECT = t.ID_PROJECT
                LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
                WHERE LOWER(ts.STATE) = 'done'
                """;

        String userFilter;
        if ("Sin asignar".equalsIgnoreCase(username)) {
            userFilter = " AND ua.USERNAME IS NULL ";
        } else {
            userFilter = " AND ua.USERNAME = ? ";
        }

        String sprintFilter = sprintId != null ? " AND t.ID_SPRINT = ? " : "";
        String orderBy = " ORDER BY NVL(t.REAL_TIME, 0) DESC, t.ID_TASK DESC ";

        String sql = baseSql + userFilter + sprintFilter + orderBy;

        Object[] params;
        if ("Sin asignar".equalsIgnoreCase(username)) {
            if (sprintId != null) {
                params = new Object[] { sprintId };
            } else {
                params = new Object[] {};
            }
        } else {
            if (sprintId != null) {
                params = new Object[] { username, sprintId };
            } else {
                params = new Object[] { username };
            }
        }

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new RealHoursTaskDetailDTO(
                        rs.getString("TASK_ID"),
                        rs.getString("TITLE"),
                        rs.getDouble("REAL_TIME")
                ),
                params
        );
    }

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

    /**
     * Calcula todos los KPIs del dashboard para un proyecto dado.
     * Consulta directamente la BD sin necesitar que el frontend envíe datos.
     */
    public ProjectKpisSummaryDTO getProjectKpisSummary(Integer projectId) {

        // ── KPI 1: Conteo de tasks por estado ──
        // TASK_STATE tiene los estados: backlog, ready, in_progress, review, done
        String taskCountsSql = """
            SELECT
                COUNT(t.ID_TASK) AS TOTAL_TASKS,
                NVL(SUM(CASE WHEN LOWER(ts.STATE) = 'backlog'     THEN 1 ELSE 0 END), 0) AS BACKLOG,
                NVL(SUM(CASE WHEN LOWER(ts.STATE) = 'ready'       THEN 1 ELSE 0 END), 0) AS READY,
                NVL(SUM(CASE WHEN LOWER(ts.STATE) = 'in_progress' THEN 1 ELSE 0 END), 0) AS IN_PROGRESS,
                NVL(SUM(CASE WHEN LOWER(ts.STATE) = 'review'      THEN 1 ELSE 0 END), 0) AS REVIEW,
                NVL(SUM(CASE WHEN LOWER(ts.STATE) = 'done'        THEN 1 ELSE 0 END), 0) AS DONE
            FROM TASK t
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
            WHERE t.ID_PROJECT = ?
            """;

        Map<String, Object> taskCounts = jdbcTemplate.queryForMap(taskCountsSql, projectId);

        int totalTasks    = ((Number) taskCounts.get("TOTAL_TASKS")).intValue();
        int tasksBacklog  = ((Number) taskCounts.get("BACKLOG")).intValue();
        int tasksReady    = ((Number) taskCounts.get("READY")).intValue();
        int tasksInProgress = ((Number) taskCounts.get("IN_PROGRESS")).intValue();
        int tasksReview   = ((Number) taskCounts.get("REVIEW")).intValue();
        int tasksDone     = ((Number) taskCounts.get("DONE")).intValue();

        // ── KPI 2: Horas reales vs estimadas ──
        // Leídas directamente de PROJECT (las columnas ya existen en tu tabla)
        String hoursSql = """
            SELECT
                NVL(SUM(CASE WHEN LOWER(ts.STATE) = 'done' THEN t.REAL_TIME ELSE 0 END), 0) AS REAL_TIME,
                NVL(SUM(t.ESTIMATED_TIME), 0) AS ESTIMATED_TIME
            FROM TASK t
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
            WHERE t.ID_PROJECT = ?
            """;

        Map<String, Object> hours = jdbcTemplate.queryForMap(hoursSql, projectId);
        double realHours      = ((Number) hours.get("REAL_TIME")).doubleValue();
        double estimatedHours = ((Number) hours.get("ESTIMATED_TIME")).doubleValue();

        // ── KPI 3 y 4: Número de developers del proyecto ──
        // Solo contamos usuarios con ROLE = 'developer', no managers
        String devCountSql = """
            SELECT COUNT(DISTINCT ua.ID_USER) AS TOTAL_DEVS
            FROM USER_ACCOUNT ua
            JOIN USER_ROLE ur ON ur.ID_USER = ua.ID_USER
            WHERE ua.ID_PROJECT = ?
            AND LOWER(ur.ROLE) = 'developer'
            """;

        Integer totalDevsResult = jdbcTemplate.queryForObject(devCountSql, Integer.class, projectId);
        int totalDevs = (totalDevsResult != null) ? totalDevsResult : 0;

        // ── KPI 3: Promedio tasks por developer ──
        double avgTasksPerDev = totalDevs > 0
            ? Math.round((double) totalTasks / totalDevs * 10.0) / 10.0
            : 0;
        
        String sprintTasksSql = """
            SELECT COUNT(t.ID_TASK) AS SPRINT_TOTAL_TASKS
            FROM TASK t
            WHERE t.ID_PROJECT = ?
            AND t.ID_SPRINT = NVL((
                SELECT ID_SPRINT FROM (
                    SELECT s.ID_SPRINT
                    FROM SPRINT s
                    WHERE s.ID_PROJECT = ?
                        AND s.START_DATE <= SYSDATE
                        AND s.END_DATE   >= SYSDATE
                ) WHERE ROWNUM = 1
            ), -1)
            """;
        
        Integer sprintTasksResult = jdbcTemplate.queryForObject(
            sprintTasksSql, Integer.class, projectId, projectId
        );
        int sprintTasks = sprintTasksResult != null ? sprintTasksResult : 0;

        // ── KPI 4: Promedio horas por developer ──
        double avgHoursPerDev = totalDevs > 0
            ? Math.round(realHours / totalDevs * 10.0) / 10.0
            : 0;

        double expectedHoursPerDev = totalDevs > 0
            ? Math.round(estimatedHours / totalDevs * 10.0) / 10.0
            : 0;

        String sprintHoursSql = """
            SELECT
                NVL(SUM(t.ESTIMATED_TIME), 0) AS SPRINT_ESTIMATED_HOURS,
                NVL(SUM(CASE WHEN LOWER(ts.STATE) = 'done' THEN t.REAL_TIME ELSE 0 END), 0) AS SPRINT_REAL_HOURS
            FROM TASK t
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
            WHERE t.ID_PROJECT = ?
            AND t.ID_SPRINT = NVL((
                SELECT ID_SPRINT FROM (
                    SELECT s.ID_SPRINT
                    FROM SPRINT s
                    WHERE s.ID_PROJECT = ?
                        AND s.START_DATE <= SYSDATE
                        AND s.END_DATE   >= SYSDATE
                ) WHERE ROWNUM = 1
            ), -1)
            """;

        Map<String, Object> sprintHours = jdbcTemplate.queryForMap(
            sprintHoursSql, projectId, projectId
        );
        double sprintEstimatedHours = ((Number) sprintHours.get("SPRINT_ESTIMATED_HOURS")).doubleValue();
        double sprintRealHours      = ((Number) sprintHours.get("SPRINT_REAL_HOURS")).doubleValue();

        return new ProjectKpisSummaryDTO(
            totalTasks, tasksBacklog, tasksReady, tasksInProgress, tasksReview, tasksDone,
            realHours, estimatedHours,
            totalDevs,
            avgTasksPerDev,
            sprintTasks,
            totalDevs,
            avgHoursPerDev, expectedHoursPerDev, sprintRealHours, sprintEstimatedHours
        );
    }
}