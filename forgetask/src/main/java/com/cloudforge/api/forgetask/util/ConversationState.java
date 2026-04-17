package com.cloudforge.api.forgetask.util;

import com.cloudforge.api.forgetask.dto.TaskDTO;
import java.io.Serializable;

/**
 * Mantiene el estado de una conversación de creación de tareas para un usuario específico
 */
public class ConversationState implements Serializable {
    private static final long serialVersionUID = 1L;

    private long chatId;
    private TaskCreationStep currentStep;
    private TaskDTO taskBeingCreated;
    private long timestamp;
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

    public boolean isExpired() {
        return (System.currentTimeMillis() - timestamp) > CONVERSATION_TIMEOUT_MS;
    }

    public void reset() {
        this.currentStep = TaskCreationStep.NONE;
        this.taskBeingCreated = new TaskDTO();
        this.timestamp = System.currentTimeMillis();
    }

    public void cancel() {
        reset();
    }
}
