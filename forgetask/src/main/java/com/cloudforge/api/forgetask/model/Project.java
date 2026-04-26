package com.cloudforge.api.forgetask.model;

import jakarta.persistence.*;

@Entity
@Table(name = "PROJECT", schema = "APP_USER")
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_seq")
    @SequenceGenerator(name = "project_seq", sequenceName = "APP_USER.SEQ_PROJECT", allocationSize = 1)
    @Column(name = "ID_PROJECT")
    private Long idProject;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "DESCRIPTION", length = 2000)
    private String description;

    // Getters y Setters
    public Long getIdProject() { return idProject; }
    public void setIdProject(Long idProject) { this.idProject = idProject; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
