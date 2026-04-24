package com.cloudforge.api.forgetask.dto;

/**
 * Task-level detail for real hours KPI drill-down.
 */
public class RealHoursTaskDetailDTO {
    private String taskId;
    private String title;
    private double realTime;

    public RealHoursTaskDetailDTO() {
    }

    public RealHoursTaskDetailDTO(String taskId, String title, double realTime) {
        this.taskId = taskId;
        this.title = title;
        this.realTime = realTime;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public double getRealTime() {
        return realTime;
    }

    public void setRealTime(double realTime) {
        this.realTime = realTime;
    }
}
