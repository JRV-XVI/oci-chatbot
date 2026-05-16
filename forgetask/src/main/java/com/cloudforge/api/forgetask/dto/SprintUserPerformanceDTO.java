package com.cloudforge.api.forgetask.dto;

public class SprintUserPerformanceDTO {
    private int idUser;
    private int idProject;
    private String username;
    private String displayName;
    private String role;
    private int doneCount;
    private int totalCount;

    public SprintUserPerformanceDTO() {
    }

    public SprintUserPerformanceDTO(
            int idUser,
            int idProject,
            String username,
            String displayName,
            String role,
            int doneCount,
            int totalCount
    ) {
        this.idUser = idUser;
        this.idProject = idProject;
        this.username = username;
        this.displayName = displayName;
        this.role = role;
        this.doneCount = doneCount;
        this.totalCount = totalCount;
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

    public int getDoneCount() {
        return doneCount;
    }

    public void setDoneCount(int doneCount) {
        this.doneCount = doneCount;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }
}
