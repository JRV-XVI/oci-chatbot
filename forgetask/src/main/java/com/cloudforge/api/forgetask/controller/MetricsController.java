package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.SprintUserPerformanceDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private static final String SPRINT_DONE_BY_USER_SQL = """
            SELECT ua.ID_USER,
                   s.ID_PROJECT,
                   ua.USERNAME,
                   ua.FIRST_NAME,
                   ua.LAST_NAME,
                   ur.ROLE,
                   NVL(SUM(NVL(ts.IS_DONE, 0)), 0) AS DONE_COUNT,
                   NVL(COUNT(t.ID_TASK), 0) AS TOTAL_COUNT
            FROM SPRINT s
            JOIN USER_ACCOUNT ua ON ua.ID_PROJECT = s.ID_PROJECT
            LEFT JOIN (
                SELECT ID_USER, MIN(ROLE) AS ROLE
                FROM USER_ROLE
                GROUP BY ID_USER
            ) ur ON ur.ID_USER = ua.ID_USER
            LEFT JOIN TASK t ON t.ID_SPRINT = s.ID_SPRINT
                           AND t.ID_PROJECT = s.ID_PROJECT
                           AND t.ID_USER = ua.ID_USER
            LEFT JOIN (
                SELECT ID_TASK,
                       MAX(CASE WHEN LOWER(STATE) = 'done' THEN 1 ELSE 0 END) AS IS_DONE
                FROM TASK_STATE
                GROUP BY ID_TASK
            ) ts ON ts.ID_TASK = t.ID_TASK
            WHERE s.ID_SPRINT = ?
            GROUP BY ua.ID_USER,
                     s.ID_PROJECT,
                     ua.USERNAME,
                     ua.FIRST_NAME,
                     ua.LAST_NAME,
                     ur.ROLE
            ORDER BY
                UPPER(ua.FIRST_NAME),
                UPPER(ua.LAST_NAME),
                UPPER(ua.USERNAME)
            """;

    private final JdbcTemplate jdbcTemplate;

    public MetricsController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/sprints/{sprintId}/tasks-done-by-user")
    public List<SprintUserPerformanceDTO> getTasksDoneByUserInSprint(@PathVariable int sprintId) {
        return jdbcTemplate.query(
                SPRINT_DONE_BY_USER_SQL,
                (rs, rowNum) -> {
                    int idUser = rs.getInt("ID_USER");
                    int idProject = rs.getInt("ID_PROJECT");
                    String username = rs.getString("USERNAME");
                    String firstName = rs.getString("FIRST_NAME");
                    String lastName = rs.getString("LAST_NAME");
                    String role = rs.getString("ROLE");
                    int doneCount = rs.getInt("DONE_COUNT");
                    int totalCount = rs.getInt("TOTAL_COUNT");

                    String displayName = buildDisplayName(firstName, lastName, username, idUser);

                    return new SprintUserPerformanceDTO(
                            idUser,
                            idProject,
                            username,
                            displayName,
                            role,
                            doneCount,
                            totalCount
                    );
                },
                sprintId
        );
    }

    private String buildDisplayName(String firstName, String lastName, String username, int idUser) {
        String composedName = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
        if (!composedName.isBlank()) {
            return composedName;
        }
        if (username != null && !username.isBlank()) {
            return username;
        }
        return String.valueOf(idUser);
    }
}
