// forgetask/src/main/java/com/cloudforge/api/forgetask/service/SprintChunkBuilder.java
package com.cloudforge.api.forgetask.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class SprintChunkBuilder {

    private static final Logger logger = LoggerFactory.getLogger(SprintChunkBuilder.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MMM/yyyy");

    private final JdbcTemplate jdbcTemplate;

    public SprintChunkBuilder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Construye el texto narrativo del sprint para vectorizar.
     * Usa el JdbcTemplate principal (ya conectado a la 26ai).
     */
    public String buildSprintChunk(int idSprint) {
        String sql = """
            SELECT
                s.TITLE           AS sprint_title,
                s.GOAL            AS sprint_goal,
                s.START_DATE,
                s.END_DATE,
                COUNT(t.ID_TASK)                                        AS total_tasks,
                NVL(SUM(t.ESTIMATED_TIME), 0)                           AS total_estimated_h,
                NVL(SUM(t.REAL_TIME), 0)                                AS total_real_h,
                COUNT(DISTINCT t.ID_USER)                               AS members_count,
                SUM(CASE WHEN t.REAL_TIME IS NOT NULL
                         AND t.REAL_TIME <= t.ESTIMATED_TIME
                         THEN 1 ELSE 0 END)                             AS tasks_on_time,
                SUM(CASE WHEN t.REAL_TIME IS NULL THEN 1 ELSE 0 END)    AS tasks_incomplete
            FROM SPRINT s
            LEFT JOIN TASK t ON t.ID_SPRINT = s.ID_SPRINT
            WHERE s.ID_SPRINT = ?
            GROUP BY s.TITLE, s.GOAL, s.START_DATE, s.END_DATE
            """;

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            String title     = rs.getString("sprint_title");
            String goal      = rs.getString("sprint_goal");

            String startDate = "N/A";
            String endDate   = "N/A";
            if (rs.getTimestamp("start_date") != null) {
                startDate = rs.getTimestamp("start_date")
                    .toLocalDateTime().toLocalDate().format(DATE_FMT);
            }
            if (rs.getTimestamp("end_date") != null) {
                endDate = rs.getTimestamp("end_date")
                    .toLocalDateTime().toLocalDate().format(DATE_FMT);
            }

            int    totalTasks   = rs.getInt("total_tasks");
            double estH         = rs.getDouble("total_estimated_h");
            double realH        = rs.getDouble("total_real_h");
            int    members      = rs.getInt("members_count");
            int    onTime       = rs.getInt("tasks_on_time");
            int    incomplete   = rs.getInt("tasks_incomplete");
            int    completed    = totalTasks - incomplete;

            double completionRate = totalTasks > 0 ? (completed * 100.0 / totalTasks) : 0.0;
            double deviationPct   = estH > 0 ? ((realH - estH) / estH) * 100.0 : 0.0;

            return """
                Sprint: "%s". Periodo: %s al %s.
                Objetivo: %s.
                Tareas planificadas: %d. Completadas: %d (%.0f%%).
                Horas estimadas: %.1fh. Horas reales: %.1fh. Desvio: %+.1f%%.
                Tareas entregadas a tiempo: %d. Tareas sin cerrar: %d.
                Miembros participantes: %d.
                """.formatted(
                    title, startDate, endDate,
                    goal != null ? goal : "Sin objetivo definido",
                    totalTasks, completed, completionRate,
                    estH, realH, deviationPct,
                    onTime, incomplete,
                    members
            );
        }, idSprint);
    }
}