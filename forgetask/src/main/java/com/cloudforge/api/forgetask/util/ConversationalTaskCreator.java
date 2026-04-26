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

/**
 * Controlador del flujo conversacional para creacion de tareas en Telegram.
 *
 * Fixes aplicados:
 *  - SKIP funciona correctamente en fechas y tiempo estimado
 *  - Fechas muestran el rango valido del sprint seleccionado
 *  - Assignee siempre muestra "Unassigned" como opcion
 *  - Summary de confirmacion muestra todos los campos
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

    public boolean processMessage(String userMessage) {
        TaskCreationStep currentStep = conversationState.getCurrentStep();

        switch (currentStep) {
            case AWAITING_TITLE        -> handleTitle(userMessage);
            case AWAITING_DESCRIPTION  -> handleDescription(userMessage);
            case AWAITING_PRIORITY     -> handlePriority(userMessage);
            case AWAITING_SPRINT       -> handleSprint(userMessage);
            case AWAITING_START_DATE   -> handleStartDate(userMessage);
            case AWAITING_END_DATE     -> handleEndDate(userMessage);
            case AWAITING_ESTIMATED_TIME -> handleEstimatedTime(userMessage);
            case AWAITING_ASSIGNEE     -> handleAssignee(userMessage);
            case AWAITING_CONFIRMATION -> handleConfirmation(userMessage);
            default -> { return false; }
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // Handlers de cada paso
    // -------------------------------------------------------------------------

    private void handleTitle(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }

        if (userMessage.isBlank()) {
            send("Title cannot be empty. Try again:");
            return;
        }

        TaskDTO task = conversationState.getTaskBeingCreated();
        task.setTitle(userMessage.trim());
        conversationState.setTaskBeingCreated(task);

        send("Description (optional)? Send text or tap SKIP.",
                KeyboardBuilder.buildOptionalFieldKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_DESCRIPTION);
    }

    private void handleDescription(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Back")) {
            send("Task title:");
            conversationState.setCurrentStep(TaskCreationStep.AWAITING_TITLE);
            return;
        }

        TaskDTO task = conversationState.getTaskBeingCreated();
        task.setDescription(userMessage.equals("SKIP") ? null : userMessage.trim());
        conversationState.setTaskBeingCreated(task);
        promptPriority();
    }

    private void promptPriority() {
        send("What is the priority?", KeyboardBuilder.buildPriorityKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_PRIORITY);
    }

    private void handlePriority(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Back")) {
            send("Description (optional)? Send text or tap SKIP.",
                    KeyboardBuilder.buildOptionalFieldKeyboard());
            conversationState.setCurrentStep(TaskCreationStep.AWAITING_DESCRIPTION);
            return;
        }

        String priority = userMessage.toLowerCase();
        if (!validPriority(priority)) {
            send("Invalid option. Select a priority:", KeyboardBuilder.buildPriorityKeyboard());
            return;
        }

        TaskDTO task = conversationState.getTaskBeingCreated();
        task.setPriority(priority);
        conversationState.setTaskBeingCreated(task);
        promptSprint();
    }

    private void promptSprint() {
        List<SprintOptionDTO> sprints = sprintController.listSprints(null);

        if (sprints == null || sprints.isEmpty()) {
            TaskDTO task = conversationState.getTaskBeingCreated();
            task.setSprintId(null);
            task.setSprintNumber(null);
            conversationState.setTaskBeingCreated(task);
            promptStartDate();
        } else {
            send("Which sprint?", KeyboardBuilder.buildSprintKeyboard(sprints));
            conversationState.setCurrentStep(TaskCreationStep.AWAITING_SPRINT);
        }
    }

    private void handleSprint(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Back")) { promptPriority(); return; }

        List<SprintOptionDTO> sprints = sprintController.listSprints(null);
        SprintOptionDTO selected = sprints.stream()
                .filter(s -> s.getTitle().equals(userMessage.trim()))
                .findFirst()
                .orElse(null);

        if (selected == null) {
            send("Invalid sprint. Try again:", KeyboardBuilder.buildSprintKeyboard(sprints));
            return;
        }

        TaskDTO task = conversationState.getTaskBeingCreated();
        task.setSprintId(selected.getIdSprint());
        task.setSprintNumber(selected.getSprintNumber());
        task.setSprintTitle(selected.getTitle());
        conversationState.setTaskBeingCreated(task);
        promptStartDate();
    }

    private void promptStartDate() {
        send(buildDatePrompt("Start", "start"), KeyboardBuilder.buildRequiredFieldKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_START_DATE);
    }

    private void handleStartDate(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Back")) { promptSprint(); return; }

        TaskDTO task = conversationState.getTaskBeingCreated();

        if (!isValidDate(userMessage)) {
            send("Invalid date. Use YYYY-MM-DD format (e.g: 2025-05-15)",
                    KeyboardBuilder.buildRequiredFieldKeyboard());
            return;
        }
        String rangeError = validateDateInSprintRange(userMessage, task);
        if (rangeError != null) {
            send(rangeError, KeyboardBuilder.buildRequiredFieldKeyboard());
            return;
        }
        task.setStartDate(userMessage.trim());

        conversationState.setTaskBeingCreated(task);
        promptEndDate();
    }

    private void promptEndDate() {
        send(buildDatePrompt("End", "end"), KeyboardBuilder.buildRequiredFieldKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_END_DATE);
    }

    private void handleEndDate(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Back")) { promptStartDate(); return; }

        TaskDTO task = conversationState.getTaskBeingCreated();

        if (!isValidDate(userMessage)) {
            send("Invalid date. Use YYYY-MM-DD format (e.g: 2025-05-15)",
                    KeyboardBuilder.buildRequiredFieldKeyboard());
            return;
        }
        String rangeError = validateDateInSprintRange(userMessage, task);
        if (rangeError != null) {
            send(rangeError, KeyboardBuilder.buildRequiredFieldKeyboard());
            return;
        }
        if (task.getStartDate() != null) {
            LocalDate start = LocalDate.parse(task.getStartDate(), DATE_FORMATTER);
            LocalDate end   = LocalDate.parse(userMessage.trim(), DATE_FORMATTER);
            if (end.isBefore(start)) {
                send("End date cannot be before start date (" + task.getStartDate() + "). Try again:",
                        KeyboardBuilder.buildRequiredFieldKeyboard());
                return;
            }
        }
        task.setEndDate(userMessage.trim());

        conversationState.setTaskBeingCreated(task);
        promptEstimatedTime();
    }

    private void promptEstimatedTime() {
        send("Estimated time in hours? (e.g: 4, 2.5)",
                KeyboardBuilder.buildRequiredFieldKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_ESTIMATED_TIME);
    }

    private void handleEstimatedTime(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Back")) { promptEndDate(); return; }

        TaskDTO task = conversationState.getTaskBeingCreated();

        try {
            double est = Double.parseDouble(userMessage.trim().replace(",", "."));
            if (est < 0) throw new NumberFormatException();
            task.setEstimatedTime(est);
        } catch (NumberFormatException e) {
            send("Invalid number. Enter a positive number (e.g: 4.5):",
                    KeyboardBuilder.buildRequiredFieldKeyboard());
            return;
        }

        conversationState.setTaskBeingCreated(task);
        promptAssignee();
    }

    private void promptAssignee() {
        ResponseEntity<List<TaskAssigneeOptionDTO>> response = taskController.getProjectUsers(null);
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_ASSIGNEE);

        // Siempre mostrar teclado — aunque la lista de usuarios este vacia,
        // el desarrollador puede elegir "Unassigned".
        List<TaskAssigneeOptionDTO> users = (response.getStatusCode().is2xxSuccessful() && response.getBody() != null)
                ? response.getBody()
                : List.of();

        send("Assign to which team member?", KeyboardBuilder.buildAssigneeKeyboard(users));
    }

    private void handleAssignee(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Back")) { promptEstimatedTime(); return; }

        ResponseEntity<List<TaskAssigneeOptionDTO>> response = taskController.getProjectUsers(null);
        List<TaskAssigneeOptionDTO> users = (response.getStatusCode().is2xxSuccessful()
                && response.getBody() != null) ? response.getBody() : List.of();

        boolean valid = users.stream().anyMatch(u -> u.getUsername().equals(userMessage.trim()));
        if (!valid) {
            send("User not found. Select from the list:", KeyboardBuilder.buildAssigneeKeyboard(users));
            return;
        }

        TaskDTO task = conversationState.getTaskBeingCreated();
        task.setAssignedTo(List.of(userMessage.trim()));
        conversationState.setTaskBeingCreated(task);
        promptConfirmation();
    }

    private void promptConfirmation() {
        TaskDTO task = conversationState.getTaskBeingCreated();
        send("Please confirm the task details:\n\n" + buildTaskSummary(task) + "\n\nCreate the task?",
                KeyboardBuilder.buildConfirmationKeyboard());
        conversationState.setCurrentStep(TaskCreationStep.AWAITING_CONFIRMATION);
    }

    private void handleConfirmation(String userMessage) {
        if (userMessage.equals("Cancel")) { cancel(); return; }
        if (userMessage.equals("Yes, create")) { createTask(); }
    }

    // -------------------------------------------------------------------------
    // Creacion de la tarea
    // -------------------------------------------------------------------------

    private void createTask() {
        try {
            TaskDTO task = conversationState.getTaskBeingCreated();

            if (task.getTitle() == null || task.getTitle().isBlank()) {
                send("Title is required.");
                promptConfirmation();
                return;
            }

            if (task.getStatus() == null)   task.setStatus("backlog");
            if (task.getPriority() == null) task.setPriority("medium");

            ResponseEntity<TaskDTO> response = taskController.createTask(task);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                send("Task created successfully!\n\n" + buildCreatedTaskSummary(response.getBody()));
                conversationState.reset();
                conversationState.setCurrentStep(TaskCreationStep.NONE);
            } else {
                send("Error creating task. Try again.");
                conversationState.cancel();
            }
        } catch (Exception e) {
            logger.error("Error creating task", e);
            send("Unexpected error: " + e.getMessage());
            conversationState.cancel();
        }
    }

    // -------------------------------------------------------------------------
    // Helpers de prompt y validacion
    // -------------------------------------------------------------------------

    /**
     * Construye el prompt de fecha mostrando el rango del sprint seleccionado
     * para guiar al usuario sobre las fechas validas.
     */
    private String buildDatePrompt(String label, String which) {
        TaskDTO task = conversationState.getTaskBeingCreated();
        StringBuilder sb = new StringBuilder();
        sb.append(label).append(" date (YYYY-MM-DD)?");

        // Si hay sprint seleccionado, mostrar su rango de fechas como referencia
        if (task.getSprintId() != null) {
            List<SprintOptionDTO> sprints = sprintController.listSprints(null);
            if (sprints != null) {
                sprints.stream()
                        .filter(s -> s.getIdSprint() == task.getSprintId())
                        .findFirst()
                        .ifPresent(sprint -> {
                            sb.append("\n\nSprint range: ")
                              .append(nullSafe(sprint.getStartDate(), "?"))
                              .append(" → ")
                              .append(nullSafe(sprint.getEndDate(), "?"));
                            sb.append("\nThe date must be within this range.");
                        });
            }
        }

        return sb.toString();
    }

    /**
     * Valida que una fecha este dentro del rango del sprint seleccionado.
     * Retorna un mensaje de error si la fecha esta fuera de rango, null si es valida.
     */
    private String validateDateInSprintRange(String dateStr, TaskDTO task) {
        if (task.getSprintId() == null) return null;

        List<SprintOptionDTO> sprints = sprintController.listSprints(null);
        if (sprints == null) return null;

        SprintOptionDTO sprint = sprints.stream()
                .filter(s -> s.getIdSprint() == task.getSprintId())
                .findFirst()
                .orElse(null);

        if (sprint == null) return null;
        if (sprint.getStartDate() == null || sprint.getEndDate() == null) return null;

        try {
            LocalDate date       = LocalDate.parse(dateStr.trim(), DATE_FORMATTER);
            LocalDate sprintStart = LocalDate.parse(sprint.getStartDate(), DATE_FORMATTER);
            LocalDate sprintEnd   = LocalDate.parse(sprint.getEndDate(), DATE_FORMATTER);

            if (date.isBefore(sprintStart) || date.isAfter(sprintEnd)) {
                return "Date out of sprint range (" + sprint.getStartDate()
                        + " → " + sprint.getEndDate() + "). Try again:";
            }
        } catch (Exception e) {
            // Si el sprint no tiene fechas parseables, no bloqueamos al usuario
            return null;
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // Construccion del resumen
    // -------------------------------------------------------------------------

    /**
     * Summary completo para el paso de confirmacion.
     * Muestra todos los campos — los opcionales muestran "—" si no se ingresaron.
     */
    private String buildTaskSummary(TaskDTO task) {
        StringBuilder sb = new StringBuilder();

        sb.append("*Title:* ").append(nullSafe(task.getTitle(), "—")).append("\n");

        sb.append("*Description:* ")
          .append(isBlank(task.getDescription()) ? "—" : task.getDescription()).append("\n");

        sb.append("*Priority:* ")
          .append(task.getPriority() != null ? task.getPriority().toUpperCase() : "MEDIUM").append("\n");

        // Sprint
        if (!isBlank(task.getSprintTitle())) {
            sb.append("*Sprint:* ").append(task.getSprintTitle()).append("\n");
        } else if (task.getSprintNumber() != null) {
            sb.append("*Sprint:* Sprint ").append(task.getSprintNumber()).append("\n");
        } else {
            sb.append("*Sprint:* —\n");
        }

        sb.append("*Start Date:* ")
          .append(isBlank(task.getStartDate()) ? "—" : task.getStartDate()).append("\n");

        sb.append("*End Date:* ")
          .append(isBlank(task.getEndDate()) ? "—" : task.getEndDate()).append("\n");

        sb.append("*Estimated Time:* ");
        if (task.getEstimatedTimeNullable() != null) {
            sb.append(task.getEstimatedTimeNullable()).append(" hours");
        } else {
            sb.append("—");
        }
        sb.append("\n");

        sb.append("*Assigned to:* ");
        if (task.getAssignedTo() != null && !task.getAssignedTo().isEmpty()) {
            sb.append(String.join(", ", task.getAssignedTo()));
        } else {
            sb.append("Unassigned");
        }
        sb.append("\n");

        return sb.toString();
    }

    private String buildCreatedTaskSummary(TaskDTO task) {
        return buildTaskSummary(task) + "*Task ID:* " + task.getId();
    }

    // -------------------------------------------------------------------------
    // Utilidades
    // -------------------------------------------------------------------------

    private void cancel() {
        send(BotMessages.CREATION_CANCELLED.getMessage());
        conversationState.cancel();
    }

    private void send(String text) {
        BotHelper.sendMessageToTelegram(conversationState.getChatId(), text, telegramClient);
    }

    private void send(String text, org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup keyboard) {
        BotHelper.sendMessageToTelegram(conversationState.getChatId(), text, telegramClient, keyboard);
    }

    private boolean isValidDate(String dateStr) {
        try {
            LocalDate.parse(dateStr.trim(), DATE_FORMATTER);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean validPriority(String p) {
        return "high".equals(p) || "medium".equals(p) || "low".equals(p);
    }

    private String nullSafe(String value, String fallback) {
        return (value == null) ? fallback : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}