package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.SprintDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SprintService {

    private static final String FIND_SPRINT_BY_ID_SQL = """
            SELECT
                s.ID_SPRINT,
                s.ID_PROJECT,
                s.TITLE,
                s.GOAL,
                TO_CHAR(s.START_DATE, 'YYYY-MM-DD') AS START_DATE_TEXT,
                TO_CHAR(s.END_DATE, 'YYYY-MM-DD')   AS END_DATE_TEXT,
                s.STATUS
            FROM SPRINT s
            WHERE s.ID_SPRINT = ?
            """;

    private final JdbcTemplate jdbcTemplate;
    private final SprintEmbeddingService sprintEmbeddingService;

    public SprintService(JdbcTemplate jdbcTemplate, SprintEmbeddingService sprintEmbeddingService) {
        this.jdbcTemplate = jdbcTemplate;
        this.sprintEmbeddingService = sprintEmbeddingService;
    }

    @Transactional
    public SprintDTO activateSprint(Long idSprint) {
        SprintDTO sprint = findSprintByIdStrict(idSprint);

        String currentStatus = normalizeStatus(sprint.getStatus());
        if (!"PLANNED".equalsIgnoreCase(currentStatus)) {
            throw new IllegalStateException("Solo se puede activar un sprint en estado PLANNED");
        }

        jdbcTemplate.update(
                "UPDATE SPRINT SET STATUS = 'ACTIVE' WHERE ID_SPRINT = ?",
                idSprint
        );

        return findSprintByIdStrict(idSprint);
    }

    @Transactional
    public SprintDTO closeSprint(Long idSprint) {
        SprintDTO sprint = findSprintByIdStrict(idSprint);

        String currentStatus = normalizeStatus(sprint.getStatus());
        if (!"ACTIVE".equalsIgnoreCase(currentStatus)) {
            throw new IllegalStateException("Solo se puede cerrar un sprint en estado ACTIVE");
        }

        jdbcTemplate.update(
                "UPDATE SPRINT SET STATUS = 'CLOSED' WHERE ID_SPRINT = ?",
                idSprint
        );

        SprintDTO closed = findSprintByIdStrict(idSprint);
        sprintEmbeddingService.indexSprint(closed.getIdSprint(), closed.getIdProject(), closed.getTitle());
        return closed;
    }

    private SprintDTO findSprintByIdStrict(Long idSprint) {
        if (idSprint == null) {
            throw new IllegalArgumentException("idSprint is required");
        }

        List<SprintDTO> results = jdbcTemplate.query(
                FIND_SPRINT_BY_ID_SQL,
                (rs, rowNum) -> new SprintDTO(
                        rs.getLong("ID_SPRINT"),
                        rs.getLong("ID_PROJECT"),
                        rs.getString("TITLE"),
                        rs.getString("GOAL"),
                        rs.getString("START_DATE_TEXT"),
                        rs.getString("END_DATE_TEXT"),
                        normalizeStatus(rs.getString("STATUS"))
                ),
                idSprint
        );

        if (results.isEmpty()) {
            throw new IllegalArgumentException("Sprint no encontrado");
        }

        return results.get(0);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "PLANNED";
        }
        return status.trim();
    }
}
