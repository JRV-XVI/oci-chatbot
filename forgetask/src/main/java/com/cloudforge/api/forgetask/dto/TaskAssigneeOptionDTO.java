package com.cloudforge.api.forgetask.dto;

public class TaskAssigneeOptionDTO {
    private int idUser;
    private int idProject;
    private String username;
    private String displayName;
    private String role;

    public TaskAssigneeOptionDTO() {
    }

    public TaskAssigneeOptionDTO(int idUser, int idProject, String username, String displayName, String role) {
        this.idUser = idUser;
        this.idProject = idProject;
        this.username = username;
        this.displayName = displayName;
        this.role = role;
    }

    public int getIdUser() {
        return idUser;
    }

    public void setIdUser(int idUser) {
        this.idUser = idUser;
    }

    public int getIdProject() {
        return idProject;
    }

    public void setIdProject(int idProject) {
        this.idProject = idProject;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
