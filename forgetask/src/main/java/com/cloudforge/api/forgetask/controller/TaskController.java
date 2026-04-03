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
                   t.TITLE,
                   t.DESCRIPTION,
                   t.START_TIME,
                   t.END_TIME,
                   t.ESTIMATED_TIME,
                   t.REAL_TIME,
                   ts.STATE
            FROM TASK t
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
            ORDER BY t.ID_TASK
            """;

    private final JdbcTemplate jdbcTemplate;

    public TaskController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ResponseEntity<List<TaskDTO>> getAllTasks() {
        List<TaskDTO> tasks = jdbcTemplate.query(SELECT_TASKS_SQL, (rs, rowNum) -> mapRowToTask(
                rs.getInt("ID_TASK"),
                rs.getObject("ID_USER"),
                rs.getString("TITLE"),
                rs.getString("DESCRIPTION"),
                rs.getObject("START_TIME"),
                rs.getObject("END_TIME"),
                rs.getObject("ESTIMATED_TIME"),
                rs.getObject("REAL_TIME"),
                rs.getString("STATE")
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
    public ResponseEntity<String> createTask(@RequestBody TaskDTO task) {
        return ResponseEntity
                .status(HttpStatus.NOT_IMPLEMENTED)
                .body("Task creation through this endpoint is not enabled for the current DB schema");
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable String id, @RequestBody TaskDTO task) {
        int taskId = Integer.parseInt(id);
        TaskDTO existingTask = findTaskById(taskId);
        if (existingTask == null) {
            return ResponseEntity.notFound().build();
        }

        String dbState = toDatabaseState(task.getStatus());

        String mergeStateSql = """
                MERGE INTO TASK_STATE ts
                USING (SELECT ? AS ID_TASK, ? AS STATE FROM dual) src
                ON (ts.ID_TASK = src.ID_TASK)
                WHEN MATCHED THEN
                  UPDATE SET ts.STATE = src.STATE
                WHEN NOT MATCHED THEN
                  INSERT (ID_TASK, STATE) VALUES (src.ID_TASK, src.STATE)
                """;

        jdbcTemplate.update(mergeStateSql, taskId, dbState, taskId, dbState);

        TaskDTO updatedTask = findTaskById(taskId);
        if (updatedTask == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteTask(@PathVariable String id) {
        int taskId = Integer.parseInt(id);
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

    private TaskDTO findTaskById(int taskId) {
        List<TaskDTO> tasks = jdbcTemplate.query(
                """
                SELECT t.ID_TASK,
                       t.ID_USER,
                       t.TITLE,
                       t.DESCRIPTION,
                       t.START_TIME,
                       t.END_TIME,
                       t.ESTIMATED_TIME,
                       t.REAL_TIME,
                       ts.STATE
                FROM TASK t
                LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
                WHERE t.ID_TASK = ?
                """,
                (rs, rowNum) -> mapRowToTask(
                        rs.getInt("ID_TASK"),
                        rs.getObject("ID_USER"),
                        rs.getString("TITLE"),
                        rs.getString("DESCRIPTION"),
                        rs.getObject("START_TIME"),
                        rs.getObject("END_TIME"),
                        rs.getObject("ESTIMATED_TIME"),
                        rs.getObject("REAL_TIME"),
                        rs.getString("STATE")
                ),
                taskId
        );

        return tasks.isEmpty() ? null : tasks.get(0);
    }

    private TaskDTO mapRowToTask(
            int id,
            Object idUser,
            String title,
            String description,
            Object startTime,
            Object endTime,
            Object estimatedTime,
            Object realTime,
            String state
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

        if (idUser != null) {
            task.setAssignedTo(List.of(String.valueOf(idUser)));
        }

        return task;
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
            return "BACKLOG";
        }

        return switch (frontendStatus) {
            case "ready" -> "READY";
            case "in-progress" -> "IN_PROGRESS";
            case "review" -> "REVIEW";
            case "done" -> "DONE";
            default -> "BACKLOG";
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
}
