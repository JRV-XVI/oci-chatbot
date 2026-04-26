package com.cloudforge.api.forgetask.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gestiona los estados de conversación para múltiples usuarios
 */
@Component
public class ConversationManager {
    private static final Logger logger = LoggerFactory.getLogger(ConversationManager.class);
    private final ConcurrentHashMap<Long, ConversationState> conversations = new ConcurrentHashMap<>();

    /**
     * Obtiene o crea el estado de conversación para un usuario
     */
    public ConversationState getOrCreateConversation(long chatId) {
        return conversations.computeIfAbsent(chatId, id -> {
            logger.info("Creating new conversation state for chatId: {}", id);
            return new ConversationState(id);
        });
    }

    /**
     * Obtiene el estado de conversación sin crear uno nuevo
     */
    public ConversationState getConversation(long chatId) {
        return conversations.get(chatId);
    }

    /**
     * Inicia una nueva conversación de creación de tareas
     */
    public void startTaskCreation(long chatId) {
        ConversationState state = getOrCreateConversation(chatId);
        state.reset();
        state.setCurrentStep(TaskCreationStep.AWAITING_TITLE);
        logger.info("Started task creation conversation for chatId: {}", chatId);
    }

    /**
     * Avanza al siguiente paso
     */
    public void nextStep(long chatId, TaskCreationStep step) {
        ConversationState state = getOrCreateConversation(chatId);
        state.setCurrentStep(step);
        logger.debug("Advanced conversation step to {} for chatId: {}", step, chatId);
    }

    /**
     * Cancela la conversación actual
     */
    public void cancelConversation(long chatId) {
        ConversationState state = conversations.get(chatId);
        if (state != null) {
            state.cancel();
            logger.info("Cancelled conversation for chatId: {}", chatId);
        }
    }

    /**
     * Limpia conversaciones expiradas (ejecutar periódicamente)
     */
    public void cleanupExpiredConversations() {
        conversations.entrySet().removeIf(entry -> {
            if (entry.getValue().isExpired()) {
                logger.info("Removing expired conversation for chatId: {}", entry.getKey());
                return true;
            }
            return false;
        });
    }

    /**
     * Elimina una conversación completamente
     */
    public void removeConversation(long chatId) {
        conversations.remove(chatId);
        logger.info("Removed conversation for chatId: {}", chatId);
    }

    public void startHoursLogging(long chatId) {
        ConversationState state = getOrCreateConversation(chatId);
        state.reset();
        state.setCurrentStep(TaskCreationStep.AWAITING_TASK_SELECTION);
    }

}
