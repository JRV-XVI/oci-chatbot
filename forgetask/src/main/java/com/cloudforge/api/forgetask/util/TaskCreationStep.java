package com.cloudforge.api.forgetask.util;

/**
 * Enum que define los pasos en el flujo conversacional de creación de tareas
 */
public enum TaskCreationStep {
    NONE("none"),
    AWAITING_TITLE("awaiting_title"),
    AWAITING_DESCRIPTION("awaiting_description"),
    AWAITING_PRIORITY("awaiting_priority"),
    AWAITING_SPRINT("awaiting_sprint"),
    AWAITING_START_DATE("awaiting_start_date"),
    AWAITING_END_DATE("awaiting_end_date"),
    AWAITING_ESTIMATED_TIME("awaiting_estimated_time"),
    AWAITING_ASSIGNEE("awaiting_assignee"),
    AWAITING_CONFIRMATION("awaiting_confirmation"),
    COMPLETED("completed");

    private final String value;

    TaskCreationStep(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static TaskCreationStep fromValue(String value) {
        for (TaskCreationStep step : TaskCreationStep.values()) {
            if (step.value.equals(value)) {
                return step;
            }
        }
        return NONE;
    }
}
