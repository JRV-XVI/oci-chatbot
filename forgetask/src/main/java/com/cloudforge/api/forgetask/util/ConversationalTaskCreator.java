package com.cloudforge.api.forgetask.util;

import com.cloudforge.api.forgetask.controller.SprintController;
import com.cloudforge.api.forgetask.controller.TaskController;
import com.cloudforge.api.forgetask.dto.SprintOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskAssigneeOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Controlador del flujo conversacional para creación de tareas en Telegram
 */
public class ConversationalTaskCreator {
    private static final Logger logger = LoggerFactory.getLogger(ConversationalTaskCreator.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final TelegramClient telegramClient;
    private final TaskController taskController;
    private final SprintController sprintController;
    private final ConversationState conversationState;

    public ConversationalTaskCreator(TelegramClient telegramClient, TaskController taskController,
                                     SprintController sprintController, ConversationState conversationState) {
        this.telegramClient = telegramClient;
        this.taskController = taskController;
        this.sprintController = sprintController;
        this.conversationState = conversationState;
    }

    /**
     * Procesa el mensaje del usuario según el paso actual de la conversación
     */
    public boolean processMessage(String userMessage) {
        TaskCreationStep currentStep = conversationState.getCurrentStep();

        switch (currentStep) {
            case AWAITING_TITLE -> handleTitle(userMessage);
            case AWAITING_DESCRIPTION -> handleDescription(userMessage);
            case AWAITING_PRIORITY -> handlePriority(userMessage);
            case AWAITING_SPRINT -> handleSprint(userMessage);
            case AWAITING_START_DATE -> handleStartDate(userMessage);
            case AWAITING_END_DATE -> handleEndDate(userMessage);
            case AWAITING_ESTIMATED_TIME -> handleEstimatedTime(userMessage);
            case AWAITING_ASSIGNEE -> handleAssignee(userMessage);
            case AWAITING_CONFIRMATION -> handleConfirmation(userMessage);
            default -> {
                return false;
            }
        }
        return true;
    }

    private void handleTitle(String userMessage) {
        if (userMessage.isBlank()) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Title cannot be empty. Try again:",
                    telegramClient);
            return;
        }

        if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        }

        TaskDTO task = conversationState.getTaskBeingCreated();
        task.setTitle(userMessage.trim());
        conversationState.setTaskBeingCreated(task);

        BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                "Description (optional)? (Enter description or click SKIP)",
                telegramClient,
                KeyboardBuilder.buildOptionalFieldKeyboard());

        conversationState.setCurrentStep(TaskCreationStep.AWAITING_DESCRIPTION);
    }

    private void handleDescription(String userMessage) {
        TaskDTO task = conversationState.getTaskBeingCreated();

        if (userMessage.equals("SKIP")) {
            task.setDescription(null);
        } else if (userMessage.equals("Back")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Task Title:",
                    telegramClient);
            conversationState.setCurrentStep(TaskCreationStep.AWAITING_TITLE);
            return;
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        } else {
            task.setDescription(userMessage.trim());
        }

        conversationState.setTaskBeingCreated(task);
        promptPriority();
    }

    private void promptPriority() {
        BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                "What is the priority?",
                telegramClient,
                KeyboardBuilder.buildPriorityKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_PRIORITY);
    }

    private void handlePriority(String userMessage) {
        TaskDTO task = conversationState.getTaskBeingCreated();

        if (userMessage.equals("Back")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Description (optional)?",
                    telegramClient,
                    KeyboardBuilder.buildOptionalFieldKeyboard());
            conversationState.setCurrentStep(TaskCreationStep.AWAITING_DESCRIPTION);
            return;
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        }

        String priority = userMessage.toLowerCase();

        if (validPriority(priority)) {
            task.setPriority(priority);
            conversationState.setTaskBeingCreated(task);
            promptSprint();
        } else {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Invalid option. Select a priority:",
                    telegramClient,
                    KeyboardBuilder.buildPriorityKeyboard());
        }
    }

    private void promptSprint() {
        List<SprintOptionDTO> sprints = sprintController.listSprints(null);

        if (sprints == null || sprints.isEmpty()) {
            // Si no hay sprints, continuar sin sprint
            TaskDTO task = conversationState.getTaskBeingCreated();
            task.setSprintId(null);
            task.setSprintNumber(null);
            conversationState.setTaskBeingCreated(task);
            promptStartDate();
        } else {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Which sprint?",
                    telegramClient,
                    KeyboardBuilder.buildSprintKeyboard(sprints));
            conversationState.setCurrentStep(TaskCreationStep.AWAITING_SPRINT);
        }
    }

    private void handleSprint(String userMessage) {
        TaskDTO task = conversationState.getTaskBeingCreated();

        if (userMessage.equals("Back")) {
            promptPriority();
            return;
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        }

        // Buscar el sprint por nombre/título
        String selectedSprintTitle = userMessage.trim();
        List<SprintOptionDTO> sprints = sprintController.listSprints(null);
        SprintOptionDTO selectedSprint = sprints.stream()
                .filter(s -> s.getTitle().equals(selectedSprintTitle))
                .findFirst()
                .orElse(null);

        if (selectedSprint != null) {
            task.setSprintId(selectedSprint.getIdSprint());
            task.setSprintNumber(selectedSprint.getSprintNumber());
            task.setSprintTitle(selectedSprint.getTitle());
            conversationState.setTaskBeingCreated(task);
            promptStartDate();
        } else {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Invalid sprint. Try again:",
                    telegramClient,
                    KeyboardBuilder.buildSprintKeyboard(sprints));
        }
    }

    private void promptStartDate() {
        BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                "Start date (format YYYY-MM-DD)? (Or click SKIP)",
                telegramClient,
                KeyboardBuilder.buildOptionalFieldKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_START_DATE);
    }

    private void handleStartDate(String userMessage) {
        TaskDTO task = conversationState.getTaskBeingCreated();

        if (userMessage.equals("SKIP")) {
            task.setStartDate(null);
        } else if (userMessage.equals("Back")) {
            promptSprint();
            return;
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        } else {
            if (!isValidDate(userMessage)) {
                BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                        "Invalid date. Use YYYY-MM-DD format (e.g: 2025-05-15)",
                        telegramClient,
                        KeyboardBuilder.buildOptionalFieldKeyboard());
                return;
            }
            task.setStartDate(userMessage.trim());
        }

        conversationState.setTaskBeingCreated(task);
        promptEndDate();
    }

    private void promptEndDate() {
        BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                "End date (format YYYY-MM-DD)? (Or click SKIP)",
                telegramClient,
                KeyboardBuilder.buildOptionalFieldKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_END_DATE);
    }

    private void handleEndDate(String userMessage) {
        TaskDTO task = conversationState.getTaskBeingCreated();

        if (userMessage.equals("SKIP")) {
            task.setEndDate(null);
        } else if (userMessage.equals("Back")) {
            promptStartDate();
            return;
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        } else {
            if (!isValidDate(userMessage)) {
                BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                        "Invalid date. Use YYYY-MM-DD format (e.g: 2025-05-15)",
                        telegramClient,
                        KeyboardBuilder.buildOptionalFieldKeyboard());
                return;
            }
            task.setEndDate(userMessage.trim());
        }

        conversationState.setTaskBeingCreated(task);
        promptEstimatedTime();
    }

    private void promptEstimatedTime() {
        BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                "Estimated time in hours? (Or click SKIP)",
                telegramClient,
                KeyboardBuilder.buildOptionalFieldKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_ESTIMATED_TIME);
    }

    private void handleEstimatedTime(String userMessage) {
        TaskDTO task = conversationState.getTaskBeingCreated();

        if (userMessage.equals("SKIP")) {
            task.setEstimatedTime(null);
        } else if (userMessage.equals("Back")) {
            promptEndDate();
            return;
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        } else {
            try {
                double estimatedTime = Double.parseDouble(userMessage.trim());
                if (estimatedTime < 0) {
                    BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                            "Estimated time must be a positive number. Try again:",
                            telegramClient,
                            KeyboardBuilder.buildOptionalFieldKeyboard());
                    return;
                }
                task.setEstimatedTime(estimatedTime);
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                        "Invalid number format. Enter a valid number (e.g: 4.5)",
                        telegramClient,
                        KeyboardBuilder.buildOptionalFieldKeyboard());
                return;
            }
        }

        conversationState.setTaskBeingCreated(task);
        promptAssignee();
    }

    private void promptAssignee() {
        ResponseEntity<List<TaskAssigneeOptionDTO>> response = taskController.getProjectUsers(null);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && !response.getBody().isEmpty()) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Assign to which user?",
                    telegramClient,
                    KeyboardBuilder.buildAssigneeKeyboard(response.getBody()));
        } else {
            TaskDTO task = conversationState.getTaskBeingCreated();
            task.setAssignedTo(null);
            conversationState.setTaskBeingCreated(task);
        }

        conversationState.setCurrentStep(TaskCreationStep.AWAITING_ASSIGNEE);
    }

    private void handleAssignee(String userMessage) {
        TaskDTO task = conversationState.getTaskBeingCreated();

        if (userMessage.equals("Back")) {
            promptEstimatedTime();
            return;
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
            return;
        } else if (userMessage.equals("Unassigned")) {
            task.setAssignedTo(null);
        } else {
            String username = userMessage.trim();
            task.setAssignedTo(List.of(username));
        }

        conversationState.setTaskBeingCreated(task);
        promptConfirmation();
    }

    private void promptConfirmation() {
        TaskDTO task = conversationState.getTaskBeingCreated();
        String summary = buildTaskSummary(task);

        BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                "Please confirm the data:\n\n" + summary + "\n\nCreate the task?",
                telegramClient,
                KeyboardBuilder.buildConfirmationKeyboard());

        conversationState.setCurrentStep(TaskCreationStep.AWAITING_CONFIRMATION);
    }

    private void handleConfirmation(String userMessage) {
        if (userMessage.equals("Yes, create")) {
            createTask();
        } else if (userMessage.equals("Cancel")) {
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    BotMessages.CREATION_CANCELLED.getMessage(),
                    telegramClient);
            conversationState.cancel();
        }
    }

    private void createTask() {
        try {
            TaskDTO task = conversationState.getTaskBeingCreated();

            // Validación básica
            if (task.getTitle() == null || task.getTitle().isBlank()) {
                BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                        "Title is required.",
                        telegramClient);
                promptConfirmation();
                return;
            }

            // Establecer valores por defecto
            if (task.getStatus() == null) {
                task.setStatus("backlog");
            }
            if (task.getPriority() == null) {
                task.setPriority("medium");
            }

            ResponseEntity<TaskDTO> response = taskController.createTask(task);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                        "Task created successfully!\n\n" + buildCreatedTaskSummary(response.getBody()),
                        telegramClient);
                conversationState.reset();
                conversationState.setCurrentStep(TaskCreationStep.NONE);
            } else {
                BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                        "Error creating task. Try again.",
                        telegramClient);
                conversationState.cancel();
            }
        } catch (Exception e) {
            logger.error("Error creating task", e);
            BotHelper.sendMessageToTelegram(conversationState.getChatId(),
                    "Unexpected error: " + e.getMessage(),
                    telegramClient);
            conversationState.cancel();
        }
    }

    private String buildTaskSummary(TaskDTO task) {
        StringBuilder summary = new StringBuilder();
        summary.append("*Title:* ").append(task.getTitle()).append("\n");

        if (task.getDescription() != null && !task.getDescription().isBlank()) {
            summary.append("*Description:* ").append(task.getDescription()).append("\n");
        }

        if (task.getPriority() != null) {
            summary.append("*Priority:* ").append(task.getPriority().toUpperCase()).append("\n");
        }

        if (task.getSprintTitle() != null && !task.getSprintTitle().isBlank()) {
            summary.append("*Sprint:* ").append(task.getSprintTitle()).append("\n");
        } else if (task.getSprintNumber() != null) {
            summary.append("*Sprint:* Sprint ").append(task.getSprintNumber()).append("\n");
        } else if (task.getSprintId() != null) {
            summary.append("*Sprint:* ").append(task.getSprintId()).append("\n");
        }

        if (task.getStartDate() != null && !task.getStartDate().isBlank()) {
            summary.append("*Start Date:* ").append(task.getStartDate()).append("\n");
        }

        if (task.getEndDate() != null && !task.getEndDate().isBlank()) {
            summary.append("*End Date:* ").append(task.getEndDate()).append("\n");
        }

        if (task.getEstimatedTime() != null && task.getEstimatedTime() > 0) {
            summary.append("*Estimated Time:* ").append(task.getEstimatedTime()).append(" hours\n");
        }

        if (task.getAssignedTo() != null && !task.getAssignedTo().isEmpty()) {
            summary.append("*Assigned to:* ").append(String.join(", ", task.getAssignedTo())).append("\n");
        } else {
            summary.append("*Assigned to:* Unassigned\n");
        }

        return summary.toString();
    }

    private String buildCreatedTaskSummary(TaskDTO task) {
        return buildTaskSummary(task) + "\nTask ID: " + task.getId();
    }

    private boolean isValidDate(String dateStr) {
        try {
            LocalDate.parse(dateStr, DATE_FORMATTER);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean validPriority(String priority) {
        return priority.equals("high") || priority.equals("medium") || priority.equals("low");
    }
}
