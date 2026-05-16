package com.cloudforge.api.forgetask.dto;

/**
 * Data Transfer Object for KPI Metrics
 * Contains all calculated KPIs for project tracking and performance analysis.
 */
public class KPIMetrics {
    private int totalTasks;
    private int completedTasks;
    private int backlogCount;
    private int readyCount;
    private int inProgressCount;
    private int reviewCount;
    private int doneCount;

    private double totalEstimatedHours;
    private double totalRealHours;
    private double completedEstimatedHours;
    private double timeVariance;
    private int progressPercentage;

    private boolean isBacklogOverloaded;
    private boolean isReadyOverloaded;
    private boolean isInProgressOverloaded;
    private boolean isReviewOverloaded;
    private boolean isDoneOverloaded;

    public KPIMetrics() {
        this.totalTasks = 0;
        this.completedTasks = 0;
        this.backlogCount = 0;
        this.readyCount = 0;
        this.inProgressCount = 0;
        this.reviewCount = 0;
        this.doneCount = 0;
        this.totalEstimatedHours = 0.0;
        this.totalRealHours = 0.0;
        this.completedEstimatedHours = 0.0;
        this.timeVariance = 0.0;
        this.progressPercentage = 0;
    }

    public int getTotalTasks() {
        return totalTasks;
    }

    public void setTotalTasks(int totalTasks) {
        this.totalTasks = totalTasks;
    }

    public int getCompletedTasks() {
        return completedTasks;
    }

    public void setCompletedTasks(int completedTasks) {
        this.completedTasks = completedTasks;
    }

    public int getBacklogCount() {
        return backlogCount;
    }

    public void setBacklogCount(int backlogCount) {
        this.backlogCount = backlogCount;
    }

    public int getReadyCount() {
        return readyCount;
    }

    public void setReadyCount(int readyCount) {
        this.readyCount = readyCount;
    }

    public int getInProgressCount() {
        return inProgressCount;
    }

    public void setInProgressCount(int inProgressCount) {
        this.inProgressCount = inProgressCount;
    }

    public int getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(int reviewCount) {
        this.reviewCount = reviewCount;
    }

    public int getDoneCount() {
        return doneCount;
    }

    public void setDoneCount(int doneCount) {
        this.doneCount = doneCount;
    }

    public double getTotalEstimatedHours() {
        return totalEstimatedHours;
    }

    public void setTotalEstimatedHours(double totalEstimatedHours) {
        this.totalEstimatedHours = totalEstimatedHours;
    }

    public double getTotalRealHours() {
        return totalRealHours;
    }

    public void setTotalRealHours(double totalRealHours) {
        this.totalRealHours = totalRealHours;
    }

    public double getCompletedEstimatedHours() {
        return completedEstimatedHours;
    }

    public void setCompletedEstimatedHours(double completedEstimatedHours) {
        this.completedEstimatedHours = completedEstimatedHours;
    }

    public double getTimeVariance() {
        return timeVariance;
    }

    public void setTimeVariance(double timeVariance) {
        this.timeVariance = timeVariance;
    }

    public int getProgressPercentage() {
        return progressPercentage;
    }

    public void setProgressPercentage(int progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public boolean isBacklogOverloaded() {
        return isBacklogOverloaded;
    }

    public void setBacklogOverloaded(boolean backlogOverloaded) {
        isBacklogOverloaded = backlogOverloaded;
    }

    public boolean isReadyOverloaded() {
        return isReadyOverloaded;
    }

    public void setReadyOverloaded(boolean readyOverloaded) {
        isReadyOverloaded = readyOverloaded;
    }

    public boolean isInProgressOverloaded() {
        return isInProgressOverloaded;
    }

    public void setInProgressOverloaded(boolean inProgressOverloaded) {
        isInProgressOverloaded = inProgressOverloaded;
    }

    public boolean isReviewOverloaded() {
        return isReviewOverloaded;
    }

    public void setReviewOverloaded(boolean reviewOverloaded) {
        isReviewOverloaded = reviewOverloaded;
    }

    public boolean isDoneOverloaded() {
        return isDoneOverloaded;
    }

    public void setDoneOverloaded(boolean doneOverloaded) {
        isDoneOverloaded = doneOverloaded;
    }

    @Override
    public String toString() {
        return "KPIMetrics{" +
                "totalTasks=" + totalTasks +
                ", completedTasks=" + completedTasks +
                ", backlogCount=" + backlogCount +
                ", readyCount=" + readyCount +
                ", inProgressCount=" + inProgressCount +
                ", reviewCount=" + reviewCount +
                ", doneCount=" + doneCount +
                ", totalEstimatedHours=" + totalEstimatedHours +
                ", totalRealHours=" + totalRealHours +
                ", completedEstimatedHours=" + completedEstimatedHours +
                ", timeVariance=" + timeVariance +
                ", progressPercentage=" + progressPercentage +
                ", isBacklogOverloaded=" + isBacklogOverloaded +
                ", isReadyOverloaded=" + isReadyOverloaded +
                ", isInProgressOverloaded=" + isInProgressOverloaded +
                ", isReviewOverloaded=" + isReviewOverloaded +
                ", isDoneOverloaded=" + isDoneOverloaded +
                '}';
    }
}