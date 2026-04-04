package com.cloudforge.api.forgetask.dto;

/**
 * CREADO EN ESTE PROMPT
 * Mensaje que envía el CLIENTE al servidor via WebSocket
 * 
 * Cliente envía: /app/task/create
 * Contiene: datos de la nueva tarea a crear
 * Ejemplo JSON: {"taskData": {"title": "Nueva tarea", "description": "Descripción", "status": "backlog"}}
 */
public class TaskCreateMessage {
    private TaskDTO taskData;

    public TaskCreateMessage() {
    }

    public TaskCreateMessage(TaskDTO taskData) {
        this.taskData = taskData;
    }

    public TaskDTO getTaskData() {
        return taskData;
    }

    public void setTaskData(TaskDTO taskData) {
        this.taskData = taskData;
    }

    @Override
    public String toString() {
        return "TaskCreateMessage{" +
                "taskData=" + taskData +
                '}';
    }
}
