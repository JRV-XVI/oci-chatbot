package com.cloudforge.api.forgetask.dto;

import java.util.List;

/**
 * Data Transfer Object for Task
 * Represents the task structure that will be used across the API
 * This mirrors the frontend Task interface for consistency
 */
public class TaskDTO {
    private String id;
    private String title;
    private String description;
    private String status; // "backlog", "ready", "in-progress", "review", "done"
    private String priority; // "low", "medium", "high"
    private String startDate;
    private String endDate;
    private Double estimatedTime; // in hours
    private Double realTime; // in hours
    private List<String> assignedTo;
    private String assignedUsername;
    private String assignedRole;

    public TaskDTO() {
    }

    public TaskDTO(String id, String title, String description, String status,
                   String priority, String startDate, String endDate,
                   Double estimatedTime, Double realTime, List<String> assignedTo,
                   String assignedUsername, String assignedRole) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.startDate = startDate;
        this.endDate = endDate;
        this.estimatedTime = estimatedTime;
        this.realTime = realTime;
        this.assignedTo = assignedTo;
        this.assignedUsername = assignedUsername;
        this.assignedRole = assignedRole;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
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

    public Double getEstimatedTime() {
        return estimatedTime != null ? estimatedTime : 0.0;
    }

    public Double getEstimatedTimeNullable() {
        return estimatedTime;
    }

    public void setEstimatedTime(Double estimatedTime) {
        this.estimatedTime = estimatedTime;
    }

    public Double getRealTime() {
        return realTime != null ? realTime : 0.0;
    }

    public Double getRealTimeNullable() {
        return realTime;
    }

    public void setRealTime(Double realTime) {
        this.realTime = realTime;
    }

    public List<String> getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(List<String> assignedTo) {
        this.assignedTo = assignedTo;
    }

    public String getAssignedUsername() {
        return assignedUsername;
    }

    public void setAssignedUsername(String assignedUsername) {
        this.assignedUsername = assignedUsername;
    }

    public String getAssignedRole() {
        return assignedRole;
    }

    public void setAssignedRole(String assignedRole) {
        this.assignedRole = assignedRole;
    }

    @Override
    public String toString() {
        return "TaskDTO{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                ", description='" + description + '\'' +
                ", status='" + status + '\'' +
                ", priority='" + priority + '\'' +
                ", startDate='" + startDate + '\'' +
                ", endDate='" + endDate + '\'' +
                ", estimatedTime=" + estimatedTime +
                ", realTime=" + realTime +
                ", assignedTo=" + assignedTo +
                ", assignedUsername='" + assignedUsername + '\'' +
                ", assignedRole='" + assignedRole + '\'' +
                '}';
    }
}