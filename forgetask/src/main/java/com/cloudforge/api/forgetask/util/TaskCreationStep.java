package com.cloudforge.api.forgetask.util;

/**
 * Enum que define los pasos en los flujos conversacionales del bot.
 *
 * Flujo de creacion de tarea:
 *   NONE -> AWAITING_TITLE -> AWAITING_DESCRIPTION -> AWAITING_PRIORITY ->
 *   AWAITING_SPRINT -> AWAITING_START_DATE -> AWAITING_END_DATE ->
 *   AWAITING_ESTIMATED_TIME -> AWAITING_ASSIGNEE -> AWAITING_CONFIRMATION -> COMPLETED
 *
 * Flujo de registro de horas reales:
 *   NONE -> AWAITING_TASK_SELECTION -> AWAITING_HOURS -> NONE
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
    COMPLETED("completed"),

    // Flujo de registro de horas reales (/loghours)
    AWAITING_TASK_SELECTION("awaiting_task_selection"),
    AWAITING_HOURS("awaiting_hours");

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

    /**
     * Retorna true si el paso corresponde al flujo de registro de horas.
     * Usado en TelegramBotController para enrutar al handler correcto.
     */
    public boolean isHoursFlow() {
        return this == AWAITING_TASK_SELECTION || this == AWAITING_HOURS;
    }
}