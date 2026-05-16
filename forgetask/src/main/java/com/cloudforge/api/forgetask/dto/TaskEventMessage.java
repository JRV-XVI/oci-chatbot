package com.cloudforge.api.forgetask.dto;

import java.time.LocalDateTime;

/**
 * CREADO EN ESTE PROMPT
 * Mensaje que envía el SERVIDOR a TODOS los clientes conectados via WebSocket
 * 
 * Servidor envía a: /topic/tasks
 * Contiene: tipo de evento + datos del evento + timestamp
 * 
 * Tipos de eventos:
 *   - TASK_CREATED: Una nueva tarea fue creada. Data contiene la TaskDTO completa.
 *   - TASK_UPDATED: Una tarea existente fue actualizada. Data contiene la TaskDTO actualizada.
 *   - TASK_DELETED: Una tarea fue eliminada. Data contiene el ID de la tarea eliminada.
 * 
 * Ejemplo JSON recibido por cliente:
 * {
 *   "type": "TASK_UPDATED",
 *   "data": {"id": "5", "title": "Nueva tarea", "status": "in-progress", ...},
 *   "timestamp": "2025-04-03T14:30:45"
 * }
 */
public class TaskEventMessage {
    // Tipos de eventos que puede emitir el servidor
    public static final String TASK_CREATED = "TASK_CREATED";
    public static final String TASK_UPDATED = "TASK_UPDATED";
    public static final String TASK_DELETED = "TASK_DELETED";

    private String type;     // Tipo de evento (TASK_CREATED, TASK_UPDATED, TASK_DELETED)
    private Object data;     // Datos del evento (puede ser TaskDTO o String con ID)
    private LocalDateTime timestamp; // Cuándo ocurrió el evento

    public TaskEventMessage() {
    }

    public TaskEventMessage(String type, Object data) {
        this.type = type;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "TaskEventMessage{" +
                "type='" + type + '\'' +
                ", data=" + data +
                ", timestamp=" + timestamp +
                '}';
    }
}
