package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.TaskAssigneeOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private static final String SELECT_TASKS_SQL = """
            SELECT t.ID_TASK,
                   t.ID_USER,
                                     t.ID_PROJECT,
               t.ID_SPRINT,
                   t.TITLE,
                   t.DESCRIPTION,
                                     t.START_DATE,
                                     t.END_DATE,
                                         TO_CHAR(t.START_DATE, 'YYYY-MM-DD') AS START_DATE_TEXT,
                                         TO_CHAR(t.END_DATE, 'YYYY-MM-DD') AS END_DATE_TEXT,
                   t.ESTIMATED_TIME,
                   t.REAL_TIME,
                                     ts.STATE,
                                     pt.PRIORITY,
                                     ua.FIRST_NAME,
                                     ua.LAST_NAME,
                                     ua.USERNAME,
                                     ur.ROLE
            FROM TASK t
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
                        LEFT JOIN (
                                SELECT ID_TASK,
                                             MAX(CASE WHEN LOWER(TAG) IN ('low', 'medium', 'high') THEN LOWER(TAG) END) AS PRIORITY
                                FROM TASK_TAG
                                GROUP BY ID_TASK
                        ) pt ON pt.ID_TASK = t.ID_TASK
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
            rs.getObject("ID_SPRINT"),
                rs.getString("TITLE"),
                rs.getString("DESCRIPTION"),
                rs.getObject("START_DATE"),
                rs.getObject("END_DATE"),
                rs.getString("START_DATE_TEXT"),
                rs.getString("END_DATE_TEXT"),
                rs.getObject("ESTIMATED_TIME"),
                rs.getObject("REAL_TIME"),
                rs.getString("STATE"),
                rs.getString("PRIORITY"),
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
    @Transactional
    public ResponseEntity<TaskDTO> createTask(@RequestBody TaskDTO task) {
        Integer nextId = jdbcTemplate.queryForObject("SELECT NVL(MAX(ID_TASK), 0) + 1 FROM TASK", Integer.class);
        if (nextId == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        if (task.getTitle() == null || task.getTitle().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        int defaultProject = resolveDefaultProjectId();
        ResolvedAssignee assignee = resolveAssigneeStrict(task.getAssignedTo(), defaultProject);
        if (assignee == null) {
            return ResponseEntity.badRequest().build();
        }

        int idUser = assignee.userId();
        int idProject = assignee.projectId();
        Integer idSprint = resolveSprintIdStrict(task.getSprintId(), idProject);
        if (task.getSprintId() != null && idSprint == null) {
            return ResponseEntity.badRequest().build();
        }
        String title = normalizeText(task.getTitle(), "Untitled task");
        String description = normalizeTextOrNull(task.getDescription());
        Timestamp startTime = parseDateOrNull(task.getStartDate());
        Timestamp endTime = parseDateOrNull(task.getEndDate());

        // VALIDATION: START DATE < END DATE
        if (!isValidDateRange(startTime, endTime)) {
            return ResponseEntity.badRequest().body(null);
        }

        Double estimated = task.getEstimatedTimeNullable();
        Double real = task.getRealTimeNullable();
        String priority = normalizePriority(task.getPriority(), "medium");

        jdbcTemplate.update(
            "INSERT INTO TASK (ID_TASK, ID_USER, ID_PROJECT, ID_SPRINT, TITLE, DESCRIPTION, START_DATE, END_DATE, ESTIMATED_TIME, REAL_TIME) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                nextId,
                idUser,
                idProject,
            idSprint,
                title,
                description,
                startTime,
                endTime,
                estimated,
                real
        );

        upsertTaskState(nextId, toDatabaseState(task.getStatus()));
        upsertTaskPriority(nextId, priority);

        TaskDTO createdTask = findTaskById(nextId);
        if (createdTask == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(createdTask);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<TaskDTO> updateTask(@PathVariable String id, @RequestBody TaskDTO task) {
        int taskId = Integer.parseInt(id);
        ExistingTaskSnapshot existingTask = findTaskSnapshotById(taskId);
        if (existingTask == null) {
            return ResponseEntity.notFound().build();
        }

        ResolvedAssignee assignee = resolveAssignee(task.getAssignedTo(), existingTask.idProject(), existingTask.idUser());
        int idUser = assignee.userId();
        int idProject = assignee.projectId();
        Integer requestedSprintId = task.getSprintId();
        Integer resolvedSprintId;
        if (requestedSprintId == null) {
            resolvedSprintId = null;
        } else {
            resolvedSprintId = resolveSprintIdStrict(requestedSprintId, idProject);
            if (resolvedSprintId == null) {
                return ResponseEntity.badRequest().build();
            }
        }
        String title = normalizeText(task.getTitle(), existingTask.title());
        String description = normalizeText(task.getDescription(), existingTask.description());
        Timestamp startTime = parseDateOrFallback(task.getStartDate(), existingTask.startTime());
        Timestamp endTime = parseDateOrFallback(task.getEndDate(), existingTask.endTime());

        // VALIDATION: START DATE < END DATE
        if (!isValidDateRange(startTime, endTime)) {
            return ResponseEntity.badRequest().body(null);
        }

        Double estimated = task.getEstimatedTimeNullable() != null ? task.getEstimatedTimeNullable() : existingTask.estimatedTime();
        Double real = task.getRealTimeNullable() != null ? task.getRealTimeNullable() : existingTask.realTime();
        String priority = normalizePriority(task.getPriority(), existingTask.priority());

        jdbcTemplate.update(
            "UPDATE TASK SET ID_USER = ?, ID_PROJECT = ?, ID_SPRINT = ?, TITLE = ?, DESCRIPTION = ?, START_DATE = ?, END_DATE = ?, ESTIMATED_TIME = ?, REAL_TIME = ? WHERE ID_TASK = ?",
            idUser,
            idProject,
            resolvedSprintId,
            title,
            description,
            startTime,
            endTime,
            estimated,
            real,
            taskId
        );

        upsertTaskState(taskId, toDatabaseState(task.getStatus()));
        upsertTaskPriority(taskId, priority);

        TaskDTO updatedTask = findTaskById(taskId);
        if (updatedTask == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Boolean> deleteTask(@PathVariable String id) {
        int taskId = Integer.parseInt(id);
        deleteTaskDependencies(taskId);
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

    @GetMapping("/meta/users")
    public ResponseEntity<List<TaskAssigneeOptionDTO>> getProjectUsers(
            @RequestParam(required = false) Integer projectId
    ) {
        int resolvedProjectId = projectId != null ? projectId : resolveDefaultProjectId();

        List<TaskAssigneeOptionDTO> users = jdbcTemplate.query(
                """
                SELECT ua.ID_USER,
                       ua.ID_PROJECT,
                       ua.USERNAME,
                       ua.FIRST_NAME,
                       ua.LAST_NAME,
                       ur.ROLE
                FROM USER_ACCOUNT ua
                LEFT JOIN (
                    SELECT ID_USER, MIN(ROLE) AS ROLE
                    FROM USER_ROLE
                    GROUP BY ID_USER
                ) ur ON ur.ID_USER = ua.ID_USER
                WHERE ua.ID_PROJECT = ?
                ORDER BY
                    UPPER(ua.FIRST_NAME),
                    UPPER(ua.LAST_NAME),
                    UPPER(ua.USERNAME)
                """,
                (rs, rowNum) -> {
                    int idUser = rs.getInt("ID_USER");
                    int idProject = rs.getInt("ID_PROJECT");
                    String username = rs.getString("USERNAME");
                    String firstName = rs.getString("FIRST_NAME");
                    String lastName = rs.getString("LAST_NAME");
                    String role = rs.getString("ROLE");
                    String displayName = buildDisplayName(firstName, lastName, username, idUser);
                    return new TaskAssigneeOptionDTO(idUser, idProject, username, displayName, role);
                },
                resolvedProjectId
        );

        return ResponseEntity.ok(users);
    }

    private TaskDTO findTaskById(int taskId) {
        List<TaskDTO> tasks = jdbcTemplate.query(
                """
                SELECT t.ID_TASK,
                       t.ID_USER,
                       t.ID_PROJECT,
                       t.ID_SPRINT,
                       t.TITLE,
                       t.DESCRIPTION,
                       t.START_DATE,
                       t.END_DATE,
                      TO_CHAR(t.START_DATE, 'YYYY-MM-DD') AS START_DATE_TEXT,
                      TO_CHAR(t.END_DATE, 'YYYY-MM-DD') AS END_DATE_TEXT,
                       t.ESTIMATED_TIME,
                       t.REAL_TIME,
                       ts.STATE,
                      pt.PRIORITY,
                       ua.FIRST_NAME,
                       ua.LAST_NAME,
                       ua.USERNAME,
                       ur.ROLE
                FROM TASK t
                LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
                  LEFT JOIN (
                      SELECT ID_TASK,
                          MAX(CASE WHEN LOWER(TAG) IN ('low', 'medium', 'high') THEN LOWER(TAG) END) AS PRIORITY
                      FROM TASK_TAG
                      GROUP BY ID_TASK
                  ) pt ON pt.ID_TASK = t.ID_TASK
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
                    rs.getObject("ID_SPRINT"),
                        rs.getString("TITLE"),
                        rs.getString("DESCRIPTION"),
                        rs.getObject("START_DATE"),
                        rs.getObject("END_DATE"),
                        rs.getString("START_DATE_TEXT"),
                        rs.getString("END_DATE_TEXT"),
                        rs.getObject("ESTIMATED_TIME"),
                        rs.getObject("REAL_TIME"),
                        rs.getString("STATE"),
                        rs.getString("PRIORITY"),
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
                SELECT t.ID_USER,
                       t.ID_PROJECT,
                       t.ID_SPRINT,
                       t.TITLE,
                       t.DESCRIPTION,
                       t.START_DATE,
                       t.END_DATE,
                       t.ESTIMATED_TIME,
                       t.REAL_TIME,
                       pt.PRIORITY
                FROM TASK t
                LEFT JOIN (
                    SELECT ID_TASK,
                           MAX(CASE WHEN LOWER(TAG) IN ('low', 'medium', 'high') THEN LOWER(TAG) END) AS PRIORITY
                    FROM TASK_TAG
                    GROUP BY ID_TASK
                ) pt ON pt.ID_TASK = t.ID_TASK
                WHERE t.ID_TASK = ?
                """,
                (rs, rowNum) -> {
                    Object sprintIdRaw = rs.getObject("ID_SPRINT");
                    Integer sprintId = sprintIdRaw instanceof Number number ? number.intValue() : null;
                    return new ExistingTaskSnapshot(
                        rs.getInt("ID_USER"),
                        rs.getInt("ID_PROJECT"),
                        sprintId,
                        rs.getString("TITLE"),
                        rs.getString("DESCRIPTION"),
                        rs.getTimestamp("START_DATE"),
                        rs.getTimestamp("END_DATE"),
                        toNullableDouble(rs.getObject("ESTIMATED_TIME")),
                        toNullableDouble(rs.getObject("REAL_TIME")),
                        rs.getString("PRIORITY")
                    );
                },
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

    private void upsertTaskPriority(int taskId, String priority) {
        String normalizedPriority = normalizePriority(priority, null);
        if (normalizedPriority == null) {
            return;
        }

        jdbcTemplate.update(
                "DELETE FROM TASK_TAG WHERE ID_TASK = ? AND LOWER(TAG) IN ('low', 'medium', 'high')",
                taskId
        );
        jdbcTemplate.update("INSERT INTO TASK_TAG (ID_TASK, TAG) VALUES (?, ?)", taskId, normalizedPriority);
    }

    private void deleteTaskDependencies(int taskId) {
        List<Map<String, Object>> dependencies = jdbcTemplate.queryForList(
                """
                SELECT uc.TABLE_NAME, ucc.COLUMN_NAME
                FROM USER_CONSTRAINTS uc
                JOIN USER_CONS_COLUMNS ucc ON ucc.CONSTRAINT_NAME = uc.CONSTRAINT_NAME
                WHERE uc.CONSTRAINT_TYPE = 'R'
                  AND uc.R_CONSTRAINT_NAME IN (
                      SELECT CONSTRAINT_NAME
                      FROM USER_CONSTRAINTS
                      WHERE TABLE_NAME = 'TASK' AND CONSTRAINT_TYPE IN ('P', 'U')
                  )
                """
        );

        for (Map<String, Object> dependency : dependencies) {
            String tableName = dependency.get("TABLE_NAME") != null ? dependency.get("TABLE_NAME").toString() : null;
            String columnName = dependency.get("COLUMN_NAME") != null ? dependency.get("COLUMN_NAME").toString() : null;

            if (tableName == null || columnName == null) {
                continue;
            }

            if (!isSafeIdentifier(tableName) || !isSafeIdentifier(columnName)) {
                continue;
            }

            jdbcTemplate.update("DELETE FROM " + tableName + " WHERE " + columnName + " = ?", taskId);
        }
    }

    private boolean isSafeIdentifier(String value) {
        return value.matches("^[A-Z0-9_]+$");
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
            Object idSprint,
            String title,
            String description,
            Object startTime,
            Object endTime,
            String startDateText,
            String endDateText,
            Object estimatedTime,
            Object realTime,
            String state,
            String priority,
            String firstName,
            String lastName,
            String username,
            String role
    ) {
        TaskDTO task = new TaskDTO();
        task.setId(String.valueOf(id));
        task.setSprintId(idSprint instanceof Number number ? number.intValue() : null);

        String resolvedTitle = (title != null && !title.isBlank()) ? title : description;
        task.setTitle(resolvedTitle != null ? resolvedTitle : "Untitled task");
        task.setDescription(description != null ? description : resolvedTitle);
        task.setStatus(toFrontendStatus(state));
        task.setPriority(normalizePriority(priority, "medium"));
        task.setStartDate(resolveDateText(startDateText, startTime));
        task.setEndDate(resolveDateText(endDateText, endTime));
        task.setEstimatedTime(toDoubleOrZero(estimatedTime));
        task.setRealTime(toDoubleOrZero(realTime));
        task.setAssignedUsername(username);
        task.setAssignedRole(role);

        String displayName = buildDisplayName(firstName, lastName, username, idUser);
        task.setAssignedTo(List.of(displayName));

        return task;
    }

    private Integer resolveSprintIdStrict(Integer sprintId, int projectId) {
        if (sprintId == null) {
            return null;
        }

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM SPRINT WHERE ID_SPRINT = ? AND ID_PROJECT = ?",
                Integer.class,
                sprintId,
                projectId
        );

        if (count != null && count > 0) {
            return sprintId;
        }

        return null;
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

    private Double toNullableDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number numberValue) {
            return numberValue.doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String normalizeText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private String normalizeTextOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private int resolveDefaultProjectId() {
        Integer defaultProject = jdbcTemplate.queryForObject("SELECT MIN(ID_PROJECT) FROM PROJECT", Integer.class);
        if (defaultProject != null) {
            return defaultProject;
        }

        Integer fallbackProject = jdbcTemplate.queryForObject("SELECT MIN(ID_PROJECT) FROM TASK", Integer.class);
        return fallbackProject != null ? fallbackProject : 1;
    }

    private ResolvedAssignee resolveAssigneeStrict(List<String> assignedTo, int projectId) {
        String rawValue = extractFirstAssignedToken(assignedTo);
        if (rawValue == null) {
            return null;
        }

        String normalizedValue = rawValue.trim();
        if (normalizedValue.isBlank()) {
            return null;
        }

        try {
            int parsedUserId = Integer.parseInt(normalizedValue);
            List<ResolvedAssignee> byId = jdbcTemplate.query(
                    """
                    SELECT ID_USER, ID_PROJECT
                    FROM USER_ACCOUNT
                    WHERE ID_USER = ? AND ID_PROJECT = ?
                    ORDER BY ID_USER
                    """,
                    (rs, rowNum) -> new ResolvedAssignee(rs.getInt("ID_USER"), rs.getInt("ID_PROJECT")),
                    parsedUserId,
                    projectId
            );
            if (!byId.isEmpty()) {
                return byId.get(0);
            }
        } catch (NumberFormatException ignored) {
            // Continues with username/full-name lookup.
        }

        List<ResolvedAssignee> byUsername = jdbcTemplate.query(
                """
                SELECT ID_USER, ID_PROJECT
                FROM USER_ACCOUNT
                WHERE UPPER(USERNAME) = UPPER(?) AND ID_PROJECT = ?
                ORDER BY ID_USER
                """,
                (rs, rowNum) -> new ResolvedAssignee(rs.getInt("ID_USER"), rs.getInt("ID_PROJECT")),
                normalizedValue,
                projectId
        );
        if (!byUsername.isEmpty()) {
            return byUsername.get(0);
        }

        List<ResolvedAssignee> byFullName = jdbcTemplate.query(
                """
                SELECT ID_USER, ID_PROJECT
                FROM USER_ACCOUNT
                WHERE UPPER(TRIM(FIRST_NAME || ' ' || LAST_NAME)) = UPPER(?) AND ID_PROJECT = ?
                ORDER BY ID_USER
                """,
                (rs, rowNum) -> new ResolvedAssignee(rs.getInt("ID_USER"), rs.getInt("ID_PROJECT")),
                normalizedValue,
                projectId
        );
        if (!byFullName.isEmpty()) {
            return byFullName.get(0);
        }

        return null;
    }

    private ResolvedAssignee resolveAssignee(List<String> assignedTo, int fallbackProjectId, int fallbackUserId) {
        String rawValue = extractFirstAssignedToken(assignedTo);
        if (rawValue == null) {
            return new ResolvedAssignee(fallbackUserId, fallbackProjectId);
        }

        String normalizedValue = rawValue.trim();
        if (normalizedValue.isBlank()) {
            return new ResolvedAssignee(fallbackUserId, fallbackProjectId);
        }

        try {
            int parsedUserId = Integer.parseInt(normalizedValue);
            List<ResolvedAssignee> byId = jdbcTemplate.query(
                    """
                    SELECT ID_USER, ID_PROJECT
                    FROM USER_ACCOUNT
                    WHERE ID_USER = ?
                    ORDER BY CASE WHEN ID_PROJECT = ? THEN 0 ELSE 1 END, ID_PROJECT
                    """,
                    (rs, rowNum) -> new ResolvedAssignee(rs.getInt("ID_USER"), rs.getInt("ID_PROJECT")),
                    parsedUserId,
                    fallbackProjectId
            );
            if (!byId.isEmpty()) {
                return byId.get(0);
            }
        } catch (NumberFormatException ignored) {
            // Continues with username/full-name lookup.
        }

        List<ResolvedAssignee> byUsername = jdbcTemplate.query(
                """
                SELECT ID_USER, ID_PROJECT
                FROM USER_ACCOUNT
                WHERE UPPER(USERNAME) = UPPER(?)
                ORDER BY CASE WHEN ID_PROJECT = ? THEN 0 ELSE 1 END, ID_PROJECT
                """,
                (rs, rowNum) -> new ResolvedAssignee(rs.getInt("ID_USER"), rs.getInt("ID_PROJECT")),
                normalizedValue,
                fallbackProjectId
        );
        if (!byUsername.isEmpty()) {
            return byUsername.get(0);
        }

        List<ResolvedAssignee> byFullName = jdbcTemplate.query(
                """
                SELECT ID_USER, ID_PROJECT
                FROM USER_ACCOUNT
                WHERE UPPER(TRIM(FIRST_NAME || ' ' || LAST_NAME)) = UPPER(?)
                ORDER BY CASE WHEN ID_PROJECT = ? THEN 0 ELSE 1 END, ID_PROJECT
                """,
                (rs, rowNum) -> new ResolvedAssignee(rs.getInt("ID_USER"), rs.getInt("ID_PROJECT")),
                normalizedValue,
                fallbackProjectId
        );
        if (!byFullName.isEmpty()) {
            return byFullName.get(0);
        }

        return new ResolvedAssignee(fallbackUserId, fallbackProjectId);
    }

    private String extractFirstAssignedToken(List<String> assignedTo) {
        if (assignedTo == null || assignedTo.isEmpty()) {
            return null;
        }
        for (String entry : assignedTo) {
            if (entry != null && !entry.isBlank()) {
                return entry;
            }
        }
        return null;
    }

    private Timestamp parseDateOrNull(String date) {
        if (date == null || date.isBlank()) {
            return null;
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
        if (value instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate().format(DateTimeFormatter.ISO_DATE);
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toLocalDate().format(DateTimeFormatter.ISO_DATE);
        }
        if (value instanceof LocalDate localDate) {
            return localDate.format(DateTimeFormatter.ISO_DATE);
        }
        if (value instanceof String stringValue) {
            String trimmed = stringValue.trim();
            if (trimmed.length() >= 10 && trimmed.matches("^\\d{4}-\\d{2}-\\d{2}.*")) {
                return trimmed.substring(0, 10);
            }
        }
        return null;
    }

    private String resolveDateText(String formattedDate, Object rawValue) {
        if (formattedDate != null && !formattedDate.isBlank()) {
            return formattedDate;
        }
        return parseDate(rawValue);
    }

    private String normalizePriority(String priority, String fallback) {
        if (priority == null || priority.isBlank()) {
            return fallback;
        }

        String normalized = priority.trim().toLowerCase();
        return switch (normalized) {
            case "low", "medium", "high" -> normalized;
            default -> fallback;
        };
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

    private boolean isValidDateRange(Timestamp startTime, Timestamp endTime) {
        if (startTime == null || endTime == null) {
            return true; // One or both null is acceptable
        }
        return startTime.before(endTime) || startTime.equals(endTime);
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
            int idProject,
            Integer idSprint,
            String title,
            String description,
            Timestamp startTime,
            Timestamp endTime,
            Double estimatedTime,
            Double realTime,
            String priority
        ) {
        }

        private record ResolvedAssignee(
            int userId,
            int projectId
    ) {
    }
}
