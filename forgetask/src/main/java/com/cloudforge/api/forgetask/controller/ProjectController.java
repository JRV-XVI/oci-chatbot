package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.ProjectOptionDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final JdbcTemplate jdbcTemplate;

    public ProjectController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
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
}
