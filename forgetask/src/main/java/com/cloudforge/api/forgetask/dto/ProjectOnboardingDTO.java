package com.cloudforge.api.forgetask.dto;

import java.time.LocalDateTime;

public class ProjectOnboardingDTO {
    private String title;
    private String description;
    private Double budget;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Double estimatedTime;

    public String getTitle()                    { return title; }
    public void setTitle(String title)          { this.title = title; }

    public String getDescription()              { return description; }
    public void setDescription(String d)        { this.description = d; }

    public Double getBudget()                   { return budget; }
    public void setBudget(Double budget)        { this.budget = budget; }

    public LocalDateTime getStartDate()         { return startDate; }
    public void setStartDate(LocalDateTime d)   { this.startDate = d; }

    public LocalDateTime getEndDate()           { return endDate; }
    public void setEndDate(LocalDateTime d)     { this.endDate = d; }

    public Double getEstimatedTime()            { return estimatedTime; }
    public void setEstimatedTime(Double t)      { this.estimatedTime = t; }
}
