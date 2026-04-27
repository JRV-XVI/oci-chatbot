package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.SprintOptionDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private static final String LIST_SPRINTS_SQL = """
            SELECT s.ID_SPRINT,
                   s.ID_PROJECT,
                   COALESCE(
                       CASE
                           WHEN REGEXP_LIKE(s.TITLE, 'Sprint\\s*#?\\s*[0-9]+', 'i')
                               THEN TO_NUMBER(REGEXP_SUBSTR(s.TITLE, 'Sprint\\s*#?\\s*([0-9]+)', 1, 1, NULL, 1))
                           ELSE NULL
                       END,
                       ROW_NUMBER() OVER (PARTITION BY s.ID_PROJECT ORDER BY s.START_DATE NULLS LAST, s.ID_SPRINT)
                   ) AS SPRINT_NUMBER,
                   s.TITLE,
                   s.GOAL,
                   TO_CHAR(s.START_DATE, 'YYYY-MM-DD') AS START_DATE_TEXT,
                   TO_CHAR(s.END_DATE, 'YYYY-MM-DD') AS END_DATE_TEXT
            FROM SPRINT s
            WHERE s.ID_PROJECT = ?
            ORDER BY SPRINT_NUMBER, s.START_DATE NULLS LAST, s.ID_SPRINT
            """;

    private static final String GET_SPRINT_BY_ID_SQL = """
            SELECT * FROM (
                SELECT s.ID_SPRINT,
                       s.ID_PROJECT,
                       COALESCE(
                           CASE
                               WHEN REGEXP_LIKE(s.TITLE, 'Sprint\\s*#?\\s*[0-9]+', 'i')
                                   THEN TO_NUMBER(REGEXP_SUBSTR(s.TITLE, 'Sprint\\s*#?\\s*([0-9]+)', 1, 1, NULL, 1))
                               ELSE NULL
                           END,
                           ROW_NUMBER() OVER (PARTITION BY s.ID_PROJECT ORDER BY s.START_DATE NULLS LAST, s.ID_SPRINT)
                       ) AS SPRINT_NUMBER,
                       s.TITLE,
                       s.GOAL,
                       TO_CHAR(s.START_DATE, 'YYYY-MM-DD') AS START_DATE_TEXT,
                       TO_CHAR(s.END_DATE, 'YYYY-MM-DD') AS END_DATE_TEXT
                FROM SPRINT s
                WHERE s.ID_SPRINT = ?
            )
            """;

    private static final String GET_CURRENT_SPRINT_SQL = """
            SELECT * FROM (
                SELECT s.ID_SPRINT,
                       s.ID_PROJECT,
                       COALESCE(
                           CASE
                               WHEN REGEXP_LIKE(s.TITLE, 'Sprint\\s*#?\\s*[0-9]+', 'i')
                                   THEN TO_NUMBER(REGEXP_SUBSTR(s.TITLE, 'Sprint\\s*#?\\s*([0-9]+)', 1, 1, NULL, 1))
                               ELSE NULL
                           END,
                           ROW_NUMBER() OVER (PARTITION BY s.ID_PROJECT ORDER BY s.START_DATE NULLS LAST, s.ID_SPRINT)
                       ) AS SPRINT_NUMBER,
                       s.TITLE,
                       s.GOAL,
                       TO_CHAR(s.START_DATE, 'YYYY-MM-DD') AS START_DATE_TEXT,
                       TO_CHAR(s.END_DATE, 'YYYY-MM-DD') AS END_DATE_TEXT
                FROM SPRINT s
                WHERE s.ID_PROJECT = ?
                  AND s.START_DATE <= SYSDATE
                  AND s.END_DATE >= SYSDATE
                ORDER BY s.START_DATE DESC NULLS LAST, s.ID_SPRINT DESC
            )
            WHERE ROWNUM = 1
            """;

        private static final String COUNT_OVERLAPPING_SPRINTS_SQL = """
                        SELECT COUNT(1)
                        FROM SPRINT s
                        WHERE s.ID_PROJECT = ?
                            AND s.START_DATE IS NOT NULL
                            AND s.END_DATE IS NOT NULL
                            AND s.START_DATE <= ?
                            AND s.END_DATE >= ?
                        """;

        private static final String COUNT_OVERLAPPING_SPRINTS_EXCLUDING_CURRENT_SQL = """
                        SELECT COUNT(1)
                        FROM SPRINT s
                        WHERE s.ID_PROJECT = ?
                            AND s.ID_SPRINT <> ?
                            AND s.START_DATE IS NOT NULL
                            AND s.END_DATE IS NOT NULL
                            AND s.START_DATE <= ?
                            AND s.END_DATE >= ?
                        """;

    private final JdbcTemplate jdbcTemplate;

    public SprintController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public List<SprintOptionDTO> listSprints(@RequestParam(required = false) Integer projectId) {
        int resolvedProjectId = projectId != null ? projectId : resolveDefaultProjectId();

        return jdbcTemplate.query(
                LIST_SPRINTS_SQL,
                (rs, rowNum) -> new SprintOptionDTO(
                        rs.getInt("ID_SPRINT"),
                        rs.getInt("ID_PROJECT"),
                        rs.getInt("SPRINT_NUMBER"),
                        rs.getString("TITLE"),
                        rs.getString("GOAL"),
                        rs.getString("START_DATE_TEXT"),
                        rs.getString("END_DATE_TEXT")
                ),
                resolvedProjectId
        );
    }

    @GetMapping("/current")
    public ResponseEntity<SprintOptionDTO> getCurrentSprint(@RequestParam(required = false) Integer projectId) {
        int resolvedProjectId = projectId != null ? projectId : resolveDefaultProjectId();

        List<SprintOptionDTO> current = jdbcTemplate.query(
                GET_CURRENT_SPRINT_SQL,
                (rs, rowNum) -> new SprintOptionDTO(
                        rs.getInt("ID_SPRINT"),
                        rs.getInt("ID_PROJECT"),
                        rs.getInt("SPRINT_NUMBER"),
                        rs.getString("TITLE"),
                        rs.getString("GOAL"),
                        rs.getString("START_DATE_TEXT"),
                        rs.getString("END_DATE_TEXT")
                ),
                resolvedProjectId
        );

        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.ok(current.get(0));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SprintOptionDTO> createSprint(@RequestBody SprintCreateRequest request) {
        if (request == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        if (request.sprintNumber == null || request.sprintNumber < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        int resolvedProjectId = request.projectId != null ? request.projectId : resolveDefaultProjectId();

        Timestamp startDate = parseDateOrNull(request.startDate);
        Timestamp endDate = parseDateOrNull(request.endDate);
        if (!isValidDateRange(startDate, endDate)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        if (hasOverlappingSprintDates(resolvedProjectId, startDate, endDate, null)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        Integer nextId = jdbcTemplate.queryForObject("SELECT NVL(MAX(ID_SPRINT), 0) + 1 FROM SPRINT", Integer.class);
        if (nextId == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        String title = "Sprint #" + request.sprintNumber;

        jdbcTemplate.update(
                "INSERT INTO SPRINT (ID_SPRINT, ID_PROJECT, TITLE, GOAL, START_DATE, END_DATE) VALUES (?, ?, ?, ?, ?, ?)",
                nextId,
                resolvedProjectId,
                title,
                normalizeTextOrNull(request.goal),
                startDate,
                endDate
        );

        SprintOptionDTO created = findSprintById(nextId);
        if (created == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{sprintId}")
    @Transactional
    public ResponseEntity<SprintOptionDTO> updateSprint(
            @PathVariable int sprintId,
            @RequestBody SprintUpdateRequest request
    ) {
        if (request == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        List<Map<String, Object>> existingRows = jdbcTemplate.queryForList(
                "SELECT ID_PROJECT, TITLE, GOAL, START_DATE, END_DATE FROM SPRINT WHERE ID_SPRINT = ?",
                sprintId
        );

        if (existingRows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> existing = existingRows.get(0);
        int existingProjectId = ((Number) existing.get("ID_PROJECT")).intValue();

        if (request.projectId != null && request.projectId != existingProjectId) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        String resolvedTitle = existing.get("TITLE") != null ? existing.get("TITLE").toString() : null;
        if (request.sprintNumber != null) {
            if (request.sprintNumber < 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            resolvedTitle = "Sprint #" + request.sprintNumber;
        }

        if (resolvedTitle == null || resolvedTitle.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        String resolvedGoal;
        if (request.goal != null) {
            resolvedGoal = normalizeTextOrNull(request.goal);
        } else {
            resolvedGoal = existing.get("GOAL") != null ? existing.get("GOAL").toString() : null;
        }

        Timestamp resolvedStart;
        if (request.startDate != null) {
            resolvedStart = parseDateOrNull(request.startDate);
        } else {
            resolvedStart = (Timestamp) existing.get("START_DATE");
        }

        Timestamp resolvedEnd;
        if (request.endDate != null) {
            resolvedEnd = parseDateOrNull(request.endDate);
        } else {
            resolvedEnd = (Timestamp) existing.get("END_DATE");
        }

        if (!isValidDateRange(resolvedStart, resolvedEnd)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        if (hasOverlappingSprintDates(existingProjectId, resolvedStart, resolvedEnd, sprintId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        jdbcTemplate.update(
                "UPDATE SPRINT SET TITLE = ?, GOAL = ?, START_DATE = ?, END_DATE = ? WHERE ID_SPRINT = ?",
                resolvedTitle,
                resolvedGoal,
                resolvedStart,
                resolvedEnd,
                sprintId
        );

        SprintOptionDTO updated = findSprintById(sprintId);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{sprintId}")
    @Transactional
    public ResponseEntity<Void> deleteSprint(@PathVariable int sprintId) {
        List<Map<String, Object>> existingRows = jdbcTemplate.queryForList(
                "SELECT ID_SPRINT FROM SPRINT WHERE ID_SPRINT = ?",
                sprintId
        );

        if (existingRows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        jdbcTemplate.update(
                "UPDATE TASK SET ID_SPRINT = NULL WHERE ID_SPRINT = ?",
                sprintId
        );

        jdbcTemplate.update(
                "DELETE FROM SPRINT WHERE ID_SPRINT = ?",
                sprintId
        );

        return ResponseEntity.noContent().build();
    }

    private SprintOptionDTO findSprintById(int sprintId) {
        List<SprintOptionDTO> results = jdbcTemplate.query(
                GET_SPRINT_BY_ID_SQL,
                (rs, rowNum) -> new SprintOptionDTO(
                        rs.getInt("ID_SPRINT"),
                        rs.getInt("ID_PROJECT"),
                        rs.getInt("SPRINT_NUMBER"),
                        rs.getString("TITLE"),
                        rs.getString("GOAL"),
                        rs.getString("START_DATE_TEXT"),
                        rs.getString("END_DATE_TEXT")
                ),
                sprintId
        );

        return results.isEmpty() ? null : results.get(0);
    }

    private int resolveDefaultProjectId() {
        Integer defaultProject = jdbcTemplate.queryForObject("SELECT MIN(ID_PROJECT) FROM PROJECT", Integer.class);
        if (defaultProject != null) {
            return defaultProject;
        }

        Integer fallbackProject = jdbcTemplate.queryForObject("SELECT MIN(ID_PROJECT) FROM SPRINT", Integer.class);
        return fallbackProject != null ? fallbackProject : 1;
    }

    private Timestamp parseDateOrNull(String date) {
        if (date == null || date.isBlank()) {
            return null;
        }
        return Timestamp.valueOf(LocalDate.parse(date).atStartOfDay());
    }

    private boolean isValidDateRange(Timestamp start, Timestamp end) {
        if (start == null || end == null) {
            return true;
        }
        return start.before(end) || start.equals(end);
    }

    private boolean hasOverlappingSprintDates(int projectId, Timestamp start, Timestamp end, Integer excludeSprintId) {
        if (start == null || end == null) {
            return false;
        }

        Integer count;
        if (excludeSprintId == null) {
            count = jdbcTemplate.queryForObject(
                    COUNT_OVERLAPPING_SPRINTS_SQL,
                    Integer.class,
                    projectId,
                    end,
                    start
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    COUNT_OVERLAPPING_SPRINTS_EXCLUDING_CURRENT_SQL,
                    Integer.class,
                    projectId,
                    excludeSprintId,
                    end,
                    start
            );
        }

        return count != null && count > 0;
    }

    private String normalizeTextOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    public static class SprintCreateRequest {
        public Integer projectId;
        public Integer sprintNumber;
        public String goal;
        public String startDate;
        public String endDate;
    }

    public static class SprintUpdateRequest {
        public Integer projectId;
        public Integer sprintNumber;
        public String goal;
        public String startDate;
        public String endDate;
    }
}
