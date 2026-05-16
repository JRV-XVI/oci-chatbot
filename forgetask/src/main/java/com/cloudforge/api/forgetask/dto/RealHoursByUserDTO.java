package com.cloudforge.api.forgetask.dto;

/**
 * Aggregated KPI row with real worked hours and completed task count by user.
 */
public class RealHoursByUserDTO {
    private String username;
    private String displayName;
    private double realTotalHours;
    private int doneTasks;

    public RealHoursByUserDTO() {
    }

    public RealHoursByUserDTO(String username, String displayName, double realTotalHours, int doneTasks) {
        this.username = username;
        this.displayName = displayName;
        this.realTotalHours = realTotalHours;
        this.doneTasks = doneTasks;
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
