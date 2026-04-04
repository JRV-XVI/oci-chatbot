package com.cloudforge.api.forgetask.dto;

import java.time.LocalDateTime;

/**
 * CREADO EN ESTE PROMPT
 * Mensaje que envía el CLIENTE al servidor via WebSocket
 * 
 * Cliente envía: /app/task/update
 * Contiene: ID de la tarea a actualizar + datos de la actualización
 * Ejemplo JSON: {"taskId": "5", "taskData": {"status": "in-progress", "title": "Nueva tarea"}}
 */
public class TaskUpdateMessage {
    private String taskId;
    private TaskDTO taskData;

    public TaskUpdateMessage() {
    }

    public TaskUpdateMessage(String taskId, TaskDTO taskData) {
        this.taskId = taskId;
        this.taskData = taskData;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public TaskDTO getTaskData() {
        return taskData;
    }

    public void setTaskData(TaskDTO taskData) {
        this.taskData = taskData;
    }

    @Override
    public String toString() {
        return "TaskUpdateMessage{" +
                "taskId='" + taskId + '\'' +
                ", taskData=" + taskData +
                '}';
    }
}
