package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.ProjectOnboardingDTO;
import com.cloudforge.api.forgetask.dto.ProjectOptionDTO;
import com.cloudforge.api.forgetask.model.Project;
import com.cloudforge.api.forgetask.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final JdbcTemplate jdbcTemplate;
    private final ProjectRepository projectRepository;

    public ProjectController(JdbcTemplate jdbcTemplate,
                             ProjectRepository projectRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.projectRepository = projectRepository;
    }

    @GetMapping
    public List<ProjectOptionDTO> listProjects() {
        return jdbcTemplate.query(
                """
                SELECT ID_PROJECT,
                       TITLE,
                       TO_CHAR(START_DATE, 'YYYY-MM-DD') AS START_DATE_TEXT,
                       TO_CHAR(END_DATE, 'YYYY-MM-DD') AS END_DATE_TEXT
                FROM PROJECT
                ORDER BY ID_PROJECT
                """,
                (rs, rowNum) -> new ProjectOptionDTO(
                        rs.getInt("ID_PROJECT"),
                        rs.getString("TITLE"),
                        rs.getString("START_DATE_TEXT"),
                        rs.getString("END_DATE_TEXT")
                )
        );
    }

    @PutMapping("/onboarding/{id}")
    public ResponseEntity<?> completeOnboarding(
            @PathVariable Long id,
            @RequestBody ProjectOnboardingDTO dto) {
        try {
            Project project = projectRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));

            project.setTitle(dto.getTitle());
            project.setDescription(dto.getDescription());

            if (dto.getBudget() != null)
                project.setBudget(BigDecimal.valueOf(dto.getBudget()));

            if (dto.getStartDate() != null)
                project.setStartDate(dto.getStartDate());

            if (dto.getEndDate() != null)
                project.setEndDate(dto.getEndDate());

            if (dto.getEstimatedTime() != null)
                project.setEstimatedTime(BigDecimal.valueOf(dto.getEstimatedTime()));

            projectRepository.save(project);

            return ResponseEntity.ok(Map.of("message", "Proyecto configurado exitosamente"));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}