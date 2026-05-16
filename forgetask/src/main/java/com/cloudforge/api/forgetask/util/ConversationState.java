package com.cloudforge.api.forgetask.util;

import com.cloudforge.api.forgetask.dto.TaskDTO;
import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

/**
 * Mantiene el estado de un flujo conversacional activo para un usuario especifico.
 *
 * Soporta dos flujos:
 *   - Creacion de tarea (ConversationalTaskCreator): usa taskBeingCreated.
 *   - Registro de horas reales (BotActions): usa el mapa context con la clave
 *     "hours_task_id" para guardar el ID de la tarea seleccionada.
 */
public class ConversationState implements Serializable {
    private static final long serialVersionUID = 1L;

    private long chatId;
    private TaskCreationStep currentStep;
    private TaskDTO taskBeingCreated;
    private long timestamp;

    // Contexto generico para flujos que necesitan persistir datos entre mensajes.
    // El flujo de horas usa la clave BotActions.CTX_HOURS_TASK_ID ("hours_task_id").
    private final Map<String, Object> context = new HashMap<>();

    private static final long CONVERSATION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

    public ConversationState(long chatId) {
        this.chatId = chatId;
        this.currentStep = TaskCreationStep.NONE;
        this.taskBeingCreated = new TaskDTO();
        this.timestamp = System.currentTimeMillis();
    }

    public long getChatId() {
        return chatId;
    }

    public TaskCreationStep getCurrentStep() {
        return currentStep;
    }

    public void setCurrentStep(TaskCreationStep step) {
        this.currentStep = step;
        this.timestamp = System.currentTimeMillis();
    }

    public TaskDTO getTaskBeingCreated() {
        return taskBeingCreated;
    }

    public void setTaskBeingCreated(TaskDTO task) {
        this.taskBeingCreated = task;
        this.timestamp = System.currentTimeMillis();
    }

    // -------------------------------------------------------------------------
    // Contexto generico — usado por el flujo de horas reales
    // -------------------------------------------------------------------------

    public void setContext(String key, Object value) {
        context.put(key, value);
        this.timestamp = System.currentTimeMillis();
    }

    public Object getContext(String key) {
        return context.get(key);
    }

    public void clearContext() {
        context.clear();
    }

    // -------------------------------------------------------------------------

    public boolean isExpired() {
        return (System.currentTimeMillis() - timestamp) > CONVERSATION_TIMEOUT_MS;
    }

    public void reset() {
        this.currentStep = TaskCreationStep.NONE;
        this.taskBeingCreated = new TaskDTO();
        this.context.clear();
        this.timestamp = System.currentTimeMillis();
    }

    public void cancel() {
        reset();
    }
}