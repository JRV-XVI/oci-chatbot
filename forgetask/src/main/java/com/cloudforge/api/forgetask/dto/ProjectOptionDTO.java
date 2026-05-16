package com.cloudforge.api.forgetask.dto;

public class ProjectOptionDTO {
    private int idProject;
    private String title;
    private String startDate;
    private String endDate;

    public ProjectOptionDTO(int idProject, String title, String startDate, String endDate) {
        this.idProject = idProject;
        this.title = title;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public int getIdProject() {
        return idProject;
    }

    public void setIdProject(int idProject) {
        this.idProject = idProject;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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
