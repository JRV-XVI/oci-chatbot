package com.cloudforge.api.forgetask.dto;

/**
 * KPI row with done metrics for one sprint-user pair.
 */
public class RealHoursBySprintUserDTO {
    private int sprintId;
    private int sprintNumber;
    private String sprintTitle;
    private String username;
    private String displayName;
    private double realTotalHours;
    private int doneTasks;

    public RealHoursBySprintUserDTO() {
    }

    public RealHoursBySprintUserDTO(int sprintId, int sprintNumber, String sprintTitle, String username, String displayName, double realTotalHours, int doneTasks) {
        this.sprintId = sprintId;
        this.sprintNumber = sprintNumber;
        this.sprintTitle = sprintTitle;
        this.username = username;
        this.displayName = displayName;
        this.realTotalHours = realTotalHours;
        this.doneTasks = doneTasks;
    }

    public int getSprintId() {
        return sprintId;
    }

    public void setSprintId(int sprintId) {
        this.sprintId = sprintId;
    }

    public int getSprintNumber() {
        return sprintNumber;
    }

    public void setSprintNumber(int sprintNumber) {
        this.sprintNumber = sprintNumber;
    }

    public String getSprintTitle() {
        return sprintTitle;
    }

    public void setSprintTitle(String sprintTitle) {
        this.sprintTitle = sprintTitle;
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

    public double getRealTotalHours() {
        return realTotalHours;
    }

    public void setRealTotalHours(double realTotalHours) {
        this.realTotalHours = realTotalHours;
    }

    public int getDoneTasks() {
        return doneTasks;
    }

    public void setDoneTasks(int doneTasks) {
        this.doneTasks = doneTasks;
    }
}
