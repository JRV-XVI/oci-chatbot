package com.cloudforge.api.forgetask.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    @Column(name = "BUDGET", precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(name = "START_DATE")
    private LocalDateTime startDate;

    @Column(name = "END_DATE")
    private LocalDateTime endDate;

    @Column(name = "ESTIMATED_TIME", precision = 10, scale = 2)
    private BigDecimal estimatedTime;

    @Column(name = "REAL_TIME", precision = 10, scale = 2)
    private BigDecimal realTime;

    public Long getIdProject() { return idProject; }
    public void setIdProject(Long idProject) { this.idProject = idProject; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getBudget()                   { return budget; }
    public void setBudget(BigDecimal budget)        { this.budget = budget; }

    public LocalDateTime getStartDate()             { return startDate; }
    public void setStartDate(LocalDateTime d)       { this.startDate = d; }

    public LocalDateTime getEndDate()               { return endDate; }
    public void setEndDate(LocalDateTime d)         { this.endDate = d; }
    
    public BigDecimal getEstimatedTime()            { return estimatedTime; }
    public void setEstimatedTime(BigDecimal t)      { this.estimatedTime = t; }
    
    public BigDecimal getRealTime()                 { return realTime; }
    public void setRealTime(BigDecimal t)           { this.realTime = t; }
}
