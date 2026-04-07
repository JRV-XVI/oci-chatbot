package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.http.ResponseEntity;

import java.util.List;

/**
 * CREADO EN ESTE PROMPT
 * Controlador WebSocket que maneja la comunicación bidireccional en tiempo real
 * 
 * Recibe mensajes del cliente en rutas como /app/task/update
 * Procesa la actualización en la BD
 * Emite eventos a /topic/tasks para que TODOS los clientes reciban la notificación
 * 
 * FLUJO:
 * 1. Cliente conecta a WebSocket: /ws/tasks
 * 2. Cliente se suscribe a eventos: /topic/tasks
 * 3. Cliente envía actualización: /app/task/update (vía messagingTemplate.send())
 * 4. Este controlador recibe el mensaje con @MessageMapping
 * 5. Llama a TaskController para actualizar BD
 * 6. Emite evento a /topic/tasks con messagingTemplate.convertAndSend()
 * 7. TODOS los clientes reciben el evento automáticamente y actualizan su UI
 */
@Controller
public class TaskWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(TaskWebSocketController.class);

    @Autowired
    private TaskController taskController;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * ENDPOINT WebSocket: /app/task/update
     * 
     * QUÉ RECIBE:
     *   Cliente envía: {"taskId": "5", "taskData": {"status": "in-progress", "title": "Actualizado"}}
     *   Se mapea a: TaskUpdateMessage
     * 
     * QUÉ HACE:
     *   1. Llama a TaskController.updateTask() para actualizar BD
     *   2. Obtiene la tarea actualizada
     *   3. Emite evento a TODOS los clientes via /topic/tasks
     * 
     * QUÉ ENVÍA:
     *   Broadcast a /topic/tasks:
     *   {
     *     "type": "TASK_UPDATED",
     *     "data": {"id": "5", "status": "in-progress", ...},
     *     "timestamp": "2025-04-03T14:30:45"
     *   }
     *   Todos los clientes suscritos reciben este evento automáticamente
     */
    @MessageMapping("/task/update")
    public void handleTaskUpdate(@Payload TaskUpdateMessage message) {
        log.info("WebSocket: Recibido UPDATE de tarea: {}", message.getTaskId());
        
        try {
            // Llamar al controlador REST para actualizar la tarea en BD
            ResponseEntity<TaskDTO> response = taskController.updateTask(
                message.getTaskId(),
                message.getTaskData()
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                TaskDTO updatedTask = response.getBody();
                log.info("WebSocket: Tarea actualizada exitosamente: {}", updatedTask.getId());

                // Emitir evento a TODOS los clientes conectados al topic /topic/tasks
                messagingTemplate.convertAndSend(
                    "/topic/tasks",
                    new TaskEventMessage(TaskEventMessage.TASK_UPDATED, updatedTask)
                );
                log.info("WebSocket: Evento TASK_UPDATED broadcast a todos los clientes");
            } else {
                log.warn("WebSocket: Error al actualizar tarea: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("WebSocket: Error en handleTaskUpdate", e);
        }
    }

    /**
     * ENDPOINT WebSocket: /app/task/create
     * 
     * QUÉ RECIBE:
     *   Cliente envía: {"taskData": {"title": "Nueva tarea", "status": "backlog"}}
     *   Se mapea a: TaskCreateMessage
     * 
     * QUÉ HACE:
     *   1. Llama a TaskController.createTask() para crear tarea en BD
     *   2. Obtiene la tarea creada con su ID asignado
     *   3. Emite evento a TODOS los clientes via /topic/tasks
     * 
     * QUÉ ENVÍA:
     *   Broadcast a /topic/tasks:
     *   {
     *     "type": "TASK_CREATED",
     *     "data": {"id": "10", "title": "Nueva tarea", "status": "backlog", ...},
     *     "timestamp": "2025-04-03T14:30:45"
     *   }
     *   Todos los clientes ven automáticamente la nueva tarea aparecer en el Kanban
     */
    @MessageMapping("/task/create")
    public void handleTaskCreate(@Payload TaskCreateMessage message) {
        log.info("WebSocket: Recibido CREATE de nueva tarea");
        
        try {
            // Llamar al controlador REST para crear la tarea en BD
            ResponseEntity<TaskDTO> response = taskController.createTask(message.getTaskData());

            if (response.getStatusCode().is2xxSuccessful()) {
                TaskDTO newTask = response.getBody();
                log.info("WebSocket: Tarea creada exitosamente con ID: {}", newTask.getId());

                // Emitir evento a TODOS los clientes conectados
                messagingTemplate.convertAndSend(
                    "/topic/tasks",
                    new TaskEventMessage(TaskEventMessage.TASK_CREATED, newTask)
                );
                log.info("WebSocket: Evento TASK_CREATED broadcast a todos los clientes");
            } else {
                log.warn("WebSocket: Error al crear tarea: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("WebSocket: Error en handleTaskCreate", e);
        }
    }

    /**
     * ENDPOINT WebSocket: /app/task/delete
     * 
     * QUÉ RECIBE:
     *   Cliente envía: {"taskId": "5"}
     *   Se mapea a: TaskDeleteMessage
     * 
     * QUÉ HACE:
     *   1. Llama a TaskController.deleteTask() para eliminar tarea de BD
     *   2. Emite evento a TODOS los clientes via /topic/tasks
     * 
     * QUÉ ENVÍA:
     *   Broadcast a /topic/tasks:
     *   {
     *     "type": "TASK_DELETED",
     *     "data": "5",  // Solo el ID de la tarea eliminada
     *     "timestamp": "2025-04-03T14:30:45"
     *   }
     *   Todos los clientes ven automáticamente que la tarea desaparece del Kanban
     */
    @MessageMapping("/task/delete")
    public void handleTaskDelete(@Payload TaskDeleteMessage message) {
        log.info("WebSocket: Recibido DELETE de tarea: {}", message.getTaskId());
        
        try {
            // Llamar al controlador REST para eliminar la tarea de BD
            ResponseEntity<Boolean> response = taskController.deleteTask(message.getTaskId());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody()) {
                log.info("WebSocket: Tarea eliminada exitosamente: {}", message.getTaskId());

                // Emitir evento a TODOS los clientes conectados
                messagingTemplate.convertAndSend(
                    "/topic/tasks",
                    new TaskEventMessage(TaskEventMessage.TASK_DELETED, message.getTaskId())
                );
                log.info("WebSocket: Evento TASK_DELETED broadcast a todos los clientes");
            } else {
                log.warn("WebSocket: Error al eliminar tarea: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("WebSocket: Error en handleTaskDelete", e);
        }
    }
}
