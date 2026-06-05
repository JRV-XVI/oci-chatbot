package com.cloudforge.api.forgetask.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class SprintChunkBuilder {

    private static final Logger logger = LoggerFactory.getLogger(SprintChunkBuilder.class);

    private static final String SPRINT_CHUNK_SQL = """
            SELECT
                s.TITLE           AS sprint_title,
                s.GOAL            AS sprint_goal,
                s.START_DATE,
                s.END_DATE,
                COUNT(t.ID_TASK)                                        AS total_tasks,
                SUM(t.ESTIMATED_TIME)                                   AS total_estimated_h,
                SUM(NVL(t.REAL_TIME, 0))                                AS total_real_h,
                COUNT(DISTINCT t.ID_USER)                               AS members_count,
                SUM(CASE WHEN t.REAL_TIME IS NOT NULL
                         AND t.REAL_TIME <= t.ESTIMATED_TIME
                         THEN 1 ELSE 0 END)                             AS tasks_on_time,
                SUM(CASE WHEN t.REAL_TIME IS NULL THEN 1 ELSE 0 END)    AS tasks_incomplete
            FROM APP_USER.SPRINT s
            LEFT JOIN APP_USER.TASK t ON t.ID_SPRINT = s.ID_SPRINT
            WHERE s.ID_SPRINT = ?
            GROUP BY s.TITLE, s.GOAL, s.START_DATE, s.END_DATE
            """;

    private final JdbcTemplate jdbcTemplate;

    public SprintChunkBuilder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String buildSprintChunk(Long idSprint) {
        if (idSprint == null) {
            throw new IllegalArgumentException("idSprint is required");
        }

        try {
            return jdbcTemplate.queryForObject(
                    SPRINT_CHUNK_SQL,
                    (ResultSet rs, int rowNum) -> {
                        String sprintTitle = safe(rs.getString("sprint_title"));
                        String sprintGoal = safe(rs.getString("sprint_goal"));

                        Timestamp startTs = rs.getTimestamp("START_DATE");
                        Timestamp endTs = rs.getTimestamp("END_DATE");

                        long totalTasks = rs.getLong("total_tasks");
                        BigDecimal totalEstimated = nvl(rs.getBigDecimal("total_estimated_h"));
                        BigDecimal totalReal = nvl(rs.getBigDecimal("total_real_h"));
                        long membersCount = rs.getLong("members_count");
                        long tasksOnTime = rs.getLong("tasks_on_time");
                        long tasksIncomplete = rs.getLong("tasks_incomplete");

                        long completedTasks = Math.max(0, totalTasks - tasksIncomplete);
                        long completionRate = totalTasks > 0 ? Math.round((completedTasks * 100.0) / totalTasks) : 0;

                        double deviationPct;
                        if (totalEstimated.compareTo(BigDecimal.ZERO) == 0) {
                            deviationPct = 0.0;
                        } else {
                            deviationPct = totalReal.subtract(totalEstimated)
                                    .divide(totalEstimated, 6, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100))
                                    .doubleValue();
                        }

                        String startDate = formatDate(startTs);
                        String endDate = formatDate(endTs);

                        String deviationText = String.format(Locale.US, "%+.1f", deviationPct);
                        String estimatedText = formatHours(totalEstimated);
                        String realText = formatHours(totalReal);

                        return "Sprint: \"" + sprintTitle + "\". Periodo: " + startDate + " al " + endDate + ".\n"
                                + "Objetivo: " + sprintGoal + ".\n"
                                + "Tareas planificadas: " + totalTasks + ". Completadas: " + completedTasks + " (" + completionRate + "%).\n"
                                + "Horas estimadas: " + estimatedText + "h. Horas reales: " + realText + "h. Desvío: " + deviationText + "%.\n"
                                + "Tareas entregadas a tiempo: " + tasksOnTime + ". Tareas sin cerrar: " + tasksIncomplete + ".\n"
                                + "Miembros participantes: " + membersCount + ".";
                    },
                    idSprint
            );
        } catch (Exception e) {
            logger.error("Failed to build sprint chunk for idSprint={}: {}", idSprint, e.getMessage(), e);
            throw e;
        }
    }

    private String safe(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value;
    }

    private BigDecimal nvl(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String formatHours(BigDecimal value) {
        // Keep it simple: strip trailing zeros (e.g., 10.0 -> 10)
        return value.stripTrailingZeros().toPlainString();
    }

    private String formatDate(Timestamp ts) {
        if (ts == null) {
            return "-";
        }
        LocalDate date = ts.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MMM/yyyy", Locale.ENGLISH);
        return date.format(formatter);
    }
}
