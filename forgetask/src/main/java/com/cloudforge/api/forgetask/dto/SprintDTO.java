package com.cloudforge.api.forgetask.dto;

public class SprintDTO {

    private long idSprint;
    private long idProject;
    private String title;
    private String goal;
    private String startDate;
    private String endDate;
    private String status = "PLANNED";

    public SprintDTO() {
    }

    public SprintDTO(long idSprint, long idProject, String title, String goal, String startDate, String endDate, String status) {
        this.idSprint = idSprint;
        this.idProject = idProject;
        this.title = title;
        this.goal = goal;
        this.startDate = startDate;
        this.endDate = endDate;
        if (status != null && !status.isBlank()) {
            this.status = status;
        }
    }

    public long getIdSprint() {
        return idSprint;
    }

    public void setIdSprint(long idSprint) {
        this.idSprint = idSprint;
    }

    public long getIdProject() {
        return idProject;
    }

    public void setIdProject(long idProject) {
        this.idProject = idProject;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        if (status != null && !status.isBlank()) {
            this.status = status;
        }
    }
}
