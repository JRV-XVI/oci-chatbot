package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/todolist")
public class TaskController {

    private static final String SELECT_TASKS_SQL = """
            SELECT t.ID_TASK,
                   t.ID_USER,
                 t.ID_PROJECT,
                   t.TITLE,
                   t.DESCRIPTION,
                   t.START_TIME,
                   t.END_TIME,
                   t.ESTIMATED_TIME,
                   t.REAL_TIME,
                 ts.STATE,
                 ua.FIRST_NAME,
                 ua.LAST_NAME,
                 ua.USERNAME,
                 ur.ROLE
            FROM TASK t
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
             LEFT JOIN USER_ACCOUNT ua ON ua.ID_USER = t.ID_USER AND ua.ID_PROJECT = t.ID_PROJECT
             LEFT JOIN (
              SELECT ID_USER, MIN(ROLE) AS ROLE
              FROM USER_ROLE
              GROUP BY ID_USER
             ) ur ON ur.ID_USER = t.ID_USER
            ORDER BY t.ID_TASK
            """;

    private final JdbcTemplate jdbcTemplate;
    private volatile boolean taskStateConstraintChecked;

    public TaskController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ResponseEntity<List<TaskDTO>> getAllTasks() {
        List<TaskDTO> tasks = jdbcTemplate.query(SELECT_TASKS_SQL, (rs, rowNum) -> mapRowToTask(
                rs.getInt("ID_TASK"),
                rs.getObject("ID_USER"),
                rs.getObject("ID_PROJECT"),
                rs.getString("TITLE"),
                rs.getString("DESCRIPTION"),
                rs.getObject("START_TIME"),
                rs.getObject("END_TIME"),
                rs.getObject("ESTIMATED_TIME"),
                rs.getObject("REAL_TIME"),
            rs.getString("STATE"),
            rs.getString("FIRST_NAME"),
            rs.getString("LAST_NAME"),
            rs.getString("USERNAME"),
            rs.getString("ROLE")
        ));

        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getTaskById(@PathVariable String id) {
        int taskId = Integer.parseInt(id);
        TaskDTO task = findTaskById(taskId);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(task);
    }

    @PostMapping
    public ResponseEntity<TaskDTO> createTask(@RequestBody TaskDTO task) {
        Integer nextId = jdbcTemplate.queryForObject("SELECT NVL(MAX(ID_TASK), 0) + 1 FROM TASK", Integer.class);
        if (nextId == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        Integer defaultUser = jdbcTemplate.queryForObject("SELECT NVL(MIN(ID_USER), 1) FROM TASK", Integer.class);
        Integer defaultProject = jdbcTemplate.queryForObject("SELECT NVL(MIN(ID_PROJECT), 1) FROM TASK", Integer.class);

        int idUser = resolveIdUser(task.getAssignedTo(), defaultUser != null ? defaultUser : 1);
        int idProject = defaultProject != null ? defaultProject : 1;
        String title = normalizeText(task.getTitle(), "Untitled task");
        String description = normalizeText(task.getDescription(), title);
        Timestamp startTime = parseDateOrNow(task.getStartDate());
        Timestamp endTime = parseDateOrNow(task.getEndDate());
        double estimated = task.getEstimatedTime();
        double real = task.getRealTime();

        jdbcTemplate.update(
                "INSERT INTO TASK (ID_TASK, ID_USER, ID_PROJECT, TITLE, DESCRIPTION, START_TIME, END_TIME, ESTIMATED_TIME, REAL_TIME) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                nextId,
                idUser,
                idProject,
                title,
                description,
                startTime,
                endTime,
                estimated,
                real
        );

        upsertTaskState(nextId, toDatabaseState(task.getStatus()));

        TaskDTO createdTask = findTaskById(nextId);
        if (createdTask == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(createdTask);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable String id, @RequestBody TaskDTO task) {
        int taskId = Integer.parseInt(id);
        ExistingTaskSnapshot existingTask = findTaskSnapshotById(taskId);
        if (existingTask == null) {
            return ResponseEntity.notFound().build();
        }

        int idUser = resolveIdUser(task.getAssignedTo(), existingTask.idUser());
        String title = normalizeText(task.getTitle(), existingTask.title());
        String description = normalizeText(task.getDescription(), existingTask.description());
        Timestamp startTime = parseDateOrFallback(task.getStartDate(), existingTask.startTime());
        Timestamp endTime = parseDateOrFallback(task.getEndDate(), existingTask.endTime());
        double estimated = task.getEstimatedTime() != null ? task.getEstimatedTime() : existingTask.estimatedTime();
        double real = task.getRealTime() != null ? task.getRealTime() : existingTask.realTime();

        jdbcTemplate.update(
            "UPDATE TASK SET ID_USER = ?, TITLE = ?, DESCRIPTION = ?, START_TIME = ?, END_TIME = ?, ESTIMATED_TIME = ?, REAL_TIME = ? WHERE ID_TASK = ?",
            idUser,
            title,
            description,
            startTime,
            endTime,
            estimated,
            real,
            taskId
        );

        upsertTaskState(taskId, toDatabaseState(task.getStatus()));

        TaskDTO updatedTask = findTaskById(taskId);
        if (updatedTask == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteTask(@PathVariable String id) {
        int taskId = Integer.parseInt(id);
        jdbcTemplate.update("DELETE FROM TASK_TAG WHERE ID_TASK = ?", taskId);
        jdbcTemplate.update("DELETE FROM TASK_STATE WHERE ID_TASK = ?", taskId);
        int affectedRows = jdbcTemplate.update("DELETE FROM TASK WHERE ID_TASK = ?", taskId);
        return ResponseEntity.ok(affectedRows > 0);
    }

    @GetMapping("/meta/tables")
    public ResponseEntity<Map<String, List<String>>> inspectUserTables() {
        String sql = "SELECT TABLE_NAME, COLUMN_NAME FROM USER_TAB_COLUMNS ORDER BY TABLE_NAME, COLUMN_ID";
        Map<String, List<String>> tables = new LinkedHashMap<>();

        jdbcTemplate.query(sql, rs -> {
            String tableName = rs.getString("TABLE_NAME");
            String columnName = rs.getString("COLUMN_NAME");
            tables.computeIfAbsent(tableName, ignored -> new ArrayList<>()).add(columnName);
        });

        return ResponseEntity.ok(tables);
    }

    @GetMapping("/meta/states")
    public ResponseEntity<List<String>> inspectTaskStates() {
        List<String> states = jdbcTemplate.query(
                "SELECT DISTINCT STATE FROM TASK_STATE ORDER BY STATE",
                (rs, rowNum) -> rs.getString("STATE")
        );
        return ResponseEntity.ok(states);
    }

    private TaskDTO findTaskById(int taskId) {
        List<TaskDTO> tasks = jdbcTemplate.query(
                """
                SELECT t.ID_TASK,
                       t.ID_USER,
                       t.ID_PROJECT,
                       t.TITLE,
                       t.DESCRIPTION,
                       t.START_TIME,
                       t.END_TIME,
                       t.ESTIMATED_TIME,
                       t.REAL_TIME,
                       ts.STATE,
                       ua.FIRST_NAME,
                       ua.LAST_NAME,
                       ua.USERNAME,
                       ur.ROLE
                FROM TASK t
                LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
                LEFT JOIN USER_ACCOUNT ua ON ua.ID_USER = t.ID_USER AND ua.ID_PROJECT = t.ID_PROJECT
                LEFT JOIN (
                    SELECT ID_USER, MIN(ROLE) AS ROLE
                    FROM USER_ROLE
                    GROUP BY ID_USER
                ) ur ON ur.ID_USER = t.ID_USER
                WHERE t.ID_TASK = ?
                """,
                (rs, rowNum) -> mapRowToTask(
                        rs.getInt("ID_TASK"),
                        rs.getObject("ID_USER"),
                    rs.getObject("ID_PROJECT"),
                        rs.getString("TITLE"),
                        rs.getString("DESCRIPTION"),
                        rs.getObject("START_TIME"),
                        rs.getObject("END_TIME"),
                        rs.getObject("ESTIMATED_TIME"),
                        rs.getObject("REAL_TIME"),
                    rs.getString("STATE"),
                    rs.getString("FIRST_NAME"),
                    rs.getString("LAST_NAME"),
                    rs.getString("USERNAME"),
                    rs.getString("ROLE")
                ),
                taskId
        );

        return tasks.isEmpty() ? null : tasks.get(0);
    }

        private ExistingTaskSnapshot findTaskSnapshotById(int taskId) {
                List<ExistingTaskSnapshot> snapshots = jdbcTemplate.query(
                                """
                                SELECT ID_USER,
                                             TITLE,
                                             DESCRIPTION,
                                             START_TIME,
                                             END_TIME,
                                             ESTIMATED_TIME,
                                             REAL_TIME
                                FROM TASK
                                WHERE ID_TASK = ?
                                """,
                                (rs, rowNum) -> new ExistingTaskSnapshot(
                                                rs.getInt("ID_USER"),
                                                rs.getString("TITLE"),
                                                rs.getString("DESCRIPTION"),
                                                rs.getTimestamp("START_TIME"),
                                                rs.getTimestamp("END_TIME"),
                                                toDoubleOrZero(rs.getObject("ESTIMATED_TIME")),
                                                toDoubleOrZero(rs.getObject("REAL_TIME"))
                                ),
                                taskId
                );

                return snapshots.isEmpty() ? null : snapshots.get(0);
        }

        private void upsertTaskState(int taskId, String dbState) {
            ensureTaskStateConstraintSupportsReady();

                String mergeStateSql = """
                                MERGE INTO TASK_STATE ts
                                USING (SELECT ? AS ID_TASK, ? AS STATE FROM dual) src
                                ON (ts.ID_TASK = src.ID_TASK)
                                WHEN MATCHED THEN
                                    UPDATE SET ts.STATE = src.STATE
                                WHEN NOT MATCHED THEN
                                    INSERT (ID_TASK, STATE) VALUES (src.ID_TASK, src.STATE)
                                """;

                jdbcTemplate.update(mergeStateSql, taskId, dbState);
        }

    private synchronized void ensureTaskStateConstraintSupportsReady() {
        if (taskStateConstraintChecked) {
            return;
        }

        List<Map<String, Object>> constraints = jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME, SEARCH_CONDITION_VC FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'TASK_STATE' AND CONSTRAINT_TYPE = 'C'"
        );

        String constraintToReplace = null;
        boolean alreadySupportsReady = false;

        for (Map<String, Object> row : constraints) {
            Object searchConditionRaw = row.get("SEARCH_CONDITION_VC");
            String searchCondition = searchConditionRaw != null ? searchConditionRaw.toString().toLowerCase() : "";

            if (!searchCondition.contains("state")) {
                continue;
            }

            if (searchCondition.contains("'ready'")) {
                alreadySupportsReady = true;
                break;
            }

            Object constraintNameRaw = row.get("CONSTRAINT_NAME");
            if (constraintNameRaw != null) {
                constraintToReplace = constraintNameRaw.toString();
            }
        }

        if (!alreadySupportsReady && constraintToReplace != null) {
            jdbcTemplate.execute("ALTER TABLE TASK_STATE DROP CONSTRAINT " + constraintToReplace);
            jdbcTemplate.execute("ALTER TABLE TASK_STATE ADD CONSTRAINT CHK_TASK_STATE CHECK (STATE IN ('backlog','ready','in_progress','review','done'))");
        }

        taskStateConstraintChecked = true;
    }

    private TaskDTO mapRowToTask(
            int id,
            Object idUser,
            Object idProject,
            String title,
            String description,
            Object startTime,
            Object endTime,
            Object estimatedTime,
            Object realTime,
            String state,
            String firstName,
            String lastName,
            String username,
            String role
    ) {
        TaskDTO task = new TaskDTO();
        task.setId(String.valueOf(id));

        String resolvedTitle = (title != null && !title.isBlank()) ? title : description;
        task.setTitle(resolvedTitle != null ? resolvedTitle : "Untitled task");
        task.setDescription(description != null ? description : resolvedTitle);
        task.setStatus(toFrontendStatus(state));
        task.setPriority("medium");
        task.setStartDate(parseDate(startTime));
        task.setEndDate(parseDate(endTime));
        task.setEstimatedTime(toDoubleOrZero(estimatedTime));
        task.setRealTime(toDoubleOrZero(realTime));
        task.setAssignedUsername(username);
        task.setAssignedRole(role);

        String displayName = buildDisplayName(firstName, lastName, username, idUser);
        task.setAssignedTo(List.of(displayName));

        return task;
    }

    private String buildDisplayName(String firstName, String lastName, String username, Object idUser) {
        String composedName = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
        if (!composedName.isBlank()) {
            return composedName;
        }
        if (username != null && !username.isBlank()) {
            return username;
        }
        return idUser != null ? String.valueOf(idUser) : "Unknown user";
    }

    private double toDoubleOrZero(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Number numberValue) {
            return numberValue.doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ignored) {
            return 0.0;
        }
    }

    private String normalizeText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private int resolveIdUser(List<String> assignedTo, int fallbackUserId) {
        if (assignedTo != null && !assignedTo.isEmpty()) {
            String rawValue = assignedTo.get(0);
            try {
                return Integer.parseInt(rawValue);
            } catch (NumberFormatException ignored) {
                return fallbackUserId;
            }
        }
        return fallbackUserId;
    }

    private Timestamp parseDateOrNow(String date) {
        if (date == null || date.isBlank()) {
            return Timestamp.valueOf(LocalDateTime.now());
        }
        return Timestamp.valueOf(LocalDate.parse(date).atStartOfDay());
    }

    private Timestamp parseDateOrFallback(String date, Timestamp fallback) {
        if (date == null || date.isBlank()) {
            return fallback;
        }
        return Timestamp.valueOf(LocalDate.parse(date).atStartOfDay());
    }

    private String parseDate(Object value) {
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toLocalDate().format(DateTimeFormatter.ISO_DATE);
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate().format(DateTimeFormatter.ISO_DATE);
        }
        if (value instanceof LocalDate localDate) {
            return localDate.format(DateTimeFormatter.ISO_DATE);
        }
        return LocalDate.now().format(DateTimeFormatter.ISO_DATE);
    }

    private String toFrontendStatus(String dbState) {
        if (dbState == null || dbState.isBlank()) {
            return "backlog";
        }

        String normalized = dbState.trim().toUpperCase().replace('-', '_').replace(' ', '_');

        return switch (normalized) {
            case "READY" -> "ready";
            case "IN_PROGRESS", "DOING" -> "in-progress";
            case "REVIEW", "QA" -> "review";
            case "DONE", "COMPLETED", "FINISHED" -> "done";
            default -> "backlog";
        };
    }

    private String toDatabaseState(String frontendStatus) {
        if (frontendStatus == null || frontendStatus.isBlank()) {
            return "backlog";
        }

        return switch (frontendStatus) {
            case "ready" -> "ready";
            case "in-progress" -> "in_progress";
            case "review" -> "review";
            case "done" -> "done";
            default -> "backlog";
        };
    }

    @ExceptionHandler(NumberFormatException.class)
    public ResponseEntity<String> handleNumberFormatError(Exception exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid task id: " + exception.getMessage());
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<String> handleDataAccessError(Exception exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Database error: " + exception.getMessage());
    }

    private record ExistingTaskSnapshot(
            int idUser,
            String title,
            String description,
            Timestamp startTime,
            Timestamp endTime,
            double estimatedTime,
            double realTime
    ) {
    }
}
