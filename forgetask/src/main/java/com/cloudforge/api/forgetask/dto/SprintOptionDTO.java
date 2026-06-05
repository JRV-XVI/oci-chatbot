package com.cloudforge.api.forgetask.dto;

public class SprintOptionDTO {
    private int idSprint;
    private int idProject;
    private int sprintNumber;
    private String title;
    private String goal;
    private String startDate;
    private String endDate;
    private final String status;

    public SprintOptionDTO(int idSprint, int idProject, int sprintNumber,
                           String title, String goal,
                           String startDate, String endDate, String status) {
        this.idSprint     = idSprint;
        this.idProject    = idProject;
        this.sprintNumber = sprintNumber;
        this.title        = title;
        this.goal         = goal;
        this.startDate    = startDate;
        this.endDate      = endDate;
        this.status       = status;
    }

    // Mantener el constructor anterior para compatibilidad con código existente
    public SprintOptionDTO(int idSprint, int idProject, int sprintNumber,
                           String title, String goal,
                           String startDate, String endDate) {
        this(idSprint, idProject, sprintNumber, title, goal, startDate, endDate, "PLANNED");
    }

    public String getStatus() { return status; }

    public int getIdSprint() {
        return idSprint;
    }

    public void setIdSprint(int idSprint) {
        this.idSprint = idSprint;
    }

    public int getIdProject() {
        return idProject;
    }

    public void setIdProject(int idProject) {
        this.idProject = idProject;
    }

    public int getSprintNumber() {
        return sprintNumber;
    }

    public void setSprintNumber(int sprintNumber) {
        this.sprintNumber = sprintNumber;
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
}
