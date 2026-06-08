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

    public String buildSprintChunk(int idSprint) {
        String sql = """
            SELECT
                s.TITLE                                                         AS sprint_title,
                s.GOAL                                                          AS sprint_goal,
                s.START_DATE,
                s.END_DATE,
                COUNT(t.ID_TASK)                                                AS total_tasks,
                NVL(SUM(t.ESTIMATED_TIME), 0)                                   AS total_estimated_h,
                NVL(SUM(t.REAL_TIME), 0)                                        AS total_real_h,
                COUNT(DISTINCT t.ID_USER)                                       AS members_count,
                -- Completada = estado 'done' en TASK_STATE
                SUM(CASE WHEN LOWER(ts.STATE) = 'done' THEN 1 ELSE 0 END)      AS tasks_done,
                -- A tiempo = done Y real <= estimado Y tiene tiempo registrado
                SUM(CASE WHEN LOWER(ts.STATE) = 'done'
                         AND t.REAL_TIME IS NOT NULL
                         AND t.REAL_TIME <= t.ESTIMATED_TIME
                         THEN 1 ELSE 0 END)                                     AS tasks_on_time,
                -- Incompleta = cualquier estado que NO sea done
                SUM(CASE WHEN LOWER(ts.STATE) != 'done' THEN 1 ELSE 0 END)     AS tasks_incomplete,
                -- Desglose de estados no finalizados
                SUM(CASE WHEN LOWER(ts.STATE) = 'in_progress' THEN 1 ELSE 0 END) AS tasks_in_progress,
                SUM(CASE WHEN LOWER(ts.STATE) = 'ready'       THEN 1 ELSE 0 END) AS tasks_ready,
                SUM(CASE WHEN LOWER(ts.STATE) = 'review'      THEN 1 ELSE 0 END) AS tasks_in_review,
                SUM(CASE WHEN LOWER(ts.STATE) = 'backlog'     THEN 1 ELSE 0 END) AS tasks_backlog
            FROM SPRINT s
            LEFT JOIN TASK t        ON t.ID_SPRINT = s.ID_SPRINT
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK  = t.ID_TASK
            WHERE s.ID_SPRINT = ?
            GROUP BY s.TITLE, s.GOAL, s.START_DATE, s.END_DATE
            """;

        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            String title    = rs.getString("sprint_title");
            String goal     = rs.getString("sprint_goal");

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

            int    totalTasks    = rs.getInt("total_tasks");
            double estH          = rs.getDouble("total_estimated_h");
            double realH         = rs.getDouble("total_real_h");
            int    members       = rs.getInt("members_count");
            int    tasksDone     = rs.getInt("tasks_done");
            int    onTime        = rs.getInt("tasks_on_time");
            int    incomplete    = rs.getInt("tasks_incomplete");
            int    inProgress    = rs.getInt("tasks_in_progress");
            int    ready         = rs.getInt("tasks_ready");
            int    inReview      = rs.getInt("tasks_in_review");
            int    backlog       = rs.getInt("tasks_backlog");

            double completionRate = totalTasks > 0 ? (tasksDone * 100.0 / totalTasks) : 0.0;
            double deviationPct   = estH > 0 ? ((realH - estH) / estH) * 100.0 : 0.0;

            // Construir la descripción de tareas no finalizadas solo si las hay
            String pendingDetail = "";
            if (incomplete > 0) {
                StringBuilder sb = new StringBuilder();
                if (inProgress > 0) sb.append(inProgress).append(" en progreso");
                if (inReview   > 0) sb.append(sb.length() > 0 ? ", " : "").append(inReview).append(" en revision");
                if (ready      > 0) sb.append(sb.length() > 0 ? ", " : "").append(ready).append(" en ready");
                if (backlog    > 0) sb.append(sb.length() > 0 ? ", " : "").append(backlog).append(" en backlog");
                pendingDetail = " (" + sb + ")";
            }

            return """
                Sprint: "%s". Periodo: %s al %s.
                Objetivo: %s.
                Tareas planificadas: %d. Completadas (done): %d (%.0f%%).
                Horas estimadas: %.1fh. Horas reales: %.1fh. Desvio: %+.1f%%.
                Tareas entregadas a tiempo: %d. Tareas sin finalizar: %d%s.
                Miembros participantes: %d.
                """.formatted(
                    title, startDate, endDate,
                    goal != null ? goal : "Sin objetivo definido",
                    totalTasks, tasksDone, completionRate,
                    estH, realH, deviationPct,
                    onTime, incomplete, pendingDetail,
                    members
            );
        }, idSprint);
    }
}