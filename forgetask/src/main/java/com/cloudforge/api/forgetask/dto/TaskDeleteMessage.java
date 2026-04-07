package com.cloudforge.api.forgetask.dto;

/**
 * CREADO EN ESTE PROMPT
 * Mensaje que envía el CLIENTE al servidor via WebSocket
 * 
 * Cliente envía: /app/task/delete
 * Contiene: ID de la tarea a eliminar
 * Ejemplo JSON: {"taskId": "5"}
 */
public class TaskDeleteMessage {
    private String taskId;

    public TaskDeleteMessage() {
    }

    public TaskDeleteMessage(String taskId) {
        this.taskId = taskId;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    @Override
    public String toString() {
        return "TaskDeleteMessage{" +
                "taskId='" + taskId + '\'' +
                '}';
    }
}
