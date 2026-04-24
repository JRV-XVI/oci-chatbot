package com.cloudforge.api.forgetask.util;

import com.cloudforge.api.forgetask.controller.SprintController;
import com.cloudforge.api.forgetask.controller.TaskController;
import com.cloudforge.api.forgetask.dto.SprintOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskAssigneeOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

public class BotActions {

    private static final Logger logger = LoggerFactory.getLogger(BotActions.class);
    private static final String FIELD_SEPARATOR_REGEX = "\\|";

    private String requestText;
    private long chatId;
    private final TelegramClient telegramClient;
    private final TaskController taskController;
    private final SprintController sprintController;
    private ConversationManager conversationManager;
    private boolean exit;

    public BotActions(TelegramClient tc, TaskController taskController, SprintController sprintController) {
        telegramClient = tc;
        this.taskController = taskController;
        this.sprintController = sprintController;
        exit = false;
    }

    public void setRequestText(String cmd) {
        requestText = cmd;
    }

    public void setChatId(long chId) {
        chatId = chId;
    }

    public void setConversationManager(ConversationManager conversationManager) {
        this.conversationManager = conversationManager;
    }

    public void fnStart() {
        if (!(requestText.equals(BotCommands.START_COMMAND.getCommand()) || 
              requestText.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) || exit) {
            return;
        }

        BotHelper.sendMessageToTelegram(chatId, BotMessages.HELLO_MYTODO_BOT.getMessage(), telegramClient,
                ReplyKeyboardMarkup.builder()
                        .keyboardRow(new KeyboardRow(BotLabels.ADD_NEW_ITEM.getLabel()))
                        .build()
        );
        exit = true;
    }

    public void fnDone() {
        if (exit) {
            return;
        }

        Integer id = extractTaskIdFromAction(requestText, BotLabels.DONE.getLabel());
        if (id == null) {
            return;
        }

        try {
            if (applyStatusUpdate(id, "done")) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.ITEM_DONE.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
            }

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }
        exit = true;
    }

    public void fnUndo() {
        if (exit) {
            return;
        }

        Integer id = extractTaskIdFromAction(requestText, BotLabels.UNDO.getLabel());
        if (id == null) {
            return;
        }

        try {
            if (applyStatusUpdate(id, "backlog")) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.ITEM_UNDONE.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
            }

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }
        exit = true;
    }

    public void fnDelete() {
        if (exit) {
            return;
        }

        Integer id = extractTaskIdFromAction(requestText, BotLabels.DELETE.getLabel());
        if (id == null) {
            return;
        }

        try {
            ResponseEntity<Boolean> response = taskController.deleteTask(String.valueOf(id));
            if (response.getStatusCode().is2xxSuccessful() && Boolean.TRUE.equals(response.getBody())) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.ITEM_DELETED.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
            }

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }
        exit = true;
    }

    public void fnHide() {
        if ((requestText.equals(BotCommands.HIDE_COMMAND.getCommand()) ||
             requestText.equals(BotLabels.HIDE_MAIN_SCREEN.getLabel())) && !exit) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.BYE.getMessage(), telegramClient);
        } else {
            return;
        }
        exit = true;
    }

    public void fnListAll() {
        if (!(requestText.equals(BotCommands.TODO_LIST.getCommand()) ||
              requestText.equals(BotLabels.LIST_ALL_ITEMS.getLabel()) ||
              requestText.equals(BotLabels.MY_TODO_LIST.getLabel())) || exit) {
            return;
        }

        try {
            List<TaskDTO> allTasks = getAllTasks();
            ReplyKeyboardMarkup keyboardMarkup = ReplyKeyboardMarkup.builder()
                    .resizeKeyboard(true)
                    .oneTimeKeyboard(false)
                    .selective(true)
                    .build();

            List<KeyboardRow> keyboard = new ArrayList<>();

            // Command back to main screen
            KeyboardRow mainScreenRowTop = new KeyboardRow();
            mainScreenRowTop.add(BotLabels.SHOW_MAIN_SCREEN.getLabel());
            keyboard.add(mainScreenRowTop);

            KeyboardRow firstRow = new KeyboardRow();
            firstRow.add(BotLabels.ADD_NEW_ITEM.getLabel());
            keyboard.add(firstRow);

            KeyboardRow myTodoListTitleRow = new KeyboardRow();
            myTodoListTitleRow.add(BotLabels.MY_TODO_LIST.getLabel());
            keyboard.add(myTodoListTitleRow);

            // Active tasks
            List<TaskDTO> activeTasks = allTasks.stream()
                    .filter(task -> !"done".equalsIgnoreCase(task.getStatus()))
                    .collect(Collectors.toList());

            for (TaskDTO task : activeTasks) {
                KeyboardRow currentRow = new KeyboardRow();
                currentRow.add(formatTaskButtonLabel(task));
                currentRow.add(task.getId() + BotLabels.DASH.getLabel() + BotLabels.DONE.getLabel());
                keyboard.add(currentRow);
            }

            // Done tasks
            List<TaskDTO> doneTasks = allTasks.stream()
                    .filter(task -> "done".equalsIgnoreCase(task.getStatus()))
                    .collect(Collectors.toList());

            for (TaskDTO task : doneTasks) {
                KeyboardRow currentRow = new KeyboardRow();
                currentRow.add(formatTaskButtonLabel(task));
                currentRow.add(task.getId() + BotLabels.DASH.getLabel() + BotLabels.UNDO.getLabel());
                currentRow.add(task.getId() + BotLabels.DASH.getLabel() + BotLabels.DELETE.getLabel());
                keyboard.add(currentRow);
            }

            // Command back to main screen
            KeyboardRow mainScreenRowBottom = new KeyboardRow();
            mainScreenRowBottom.add(BotLabels.SHOW_MAIN_SCREEN.getLabel());
            keyboard.add(mainScreenRowBottom);

            keyboardMarkup.setKeyboard(keyboard);

            BotHelper.sendMessageToTelegram(
                    chatId,
                    buildTaskListHeader(activeTasks.size(), doneTasks.size()),
                    telegramClient,
                    keyboardMarkup
            );

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }
        exit = true;
    }

    public void fnAddItem() {
        if (exit) {
            return;
        }

        if (!(requestText.equals(BotCommands.ADD_ITEM.getCommand()) ||
              requestText.equals(BotCommands.ADD_TASK.getCommand()) ||
              requestText.equals(BotLabels.ADD_NEW_ITEM.getLabel()) ||
              requestText.equals(BotLabels.TASK_FORMAT_HELP.getLabel()))) {
            return;
        }

        // Iniciar flujo conversacional
        if (conversationManager != null) {
            conversationManager.startTaskCreation(chatId);
            BotHelper.sendMessageToTelegram(chatId,
                    "What is the title of the task?",
                    telegramClient);
        } else {
            // Fallback al mensaje antiguo si no hay conversation manager
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TYPE_NEW_TODO_ITEM.getMessage(), telegramClient);
        }
        exit = true;
    }

    public void fnElse() {
        if (exit) {
            return;
        }

        String payload = extractCreatePayload(requestText);
        if (payload == null) {
            return;
        }

        if (payload.startsWith("/")) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.INVALID_TASK_FORMAT.getMessage(), telegramClient);
            exit = true;
            return;
        }

        try {
            TaskDTO taskRequest = buildTaskFromPayload(payload);
            resolveSprintNumberReference(taskRequest);
            ResponseEntity<TaskDTO> response = taskController.createTask(taskRequest);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                BotHelper.sendMessageToTelegram(
                        chatId,
                        BotMessages.NEW_ITEM_ADDED.getMessage() + "\n" + buildCreatedTaskSummary(response.getBody()),
                        telegramClient
                );
            } else if (response.getStatusCode().is4xxClientError()) {
                BotHelper.sendMessageToTelegram(chatId, buildCreateTaskClientErrorMessage(taskRequest), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
            }

        } catch (IllegalArgumentException e) {
            BotHelper.sendMessageToTelegram(
                    chatId,
                    BotMessages.INVALID_TASK_FORMAT.getMessage() + "\n" + e.getMessage(),
                    telegramClient
            );
        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }

        exit = true;
    }

    private boolean applyStatusUpdate(int taskId, String status) {
        TaskDTO request = new TaskDTO();
        request.setStatus(status);

        ResponseEntity<TaskDTO> response = taskController.updateTask(String.valueOf(taskId), request);
        return response.getStatusCode().is2xxSuccessful() && response.getBody() != null;
    }

    // Helper methods
    private List<TaskDTO> getAllTasks() {
        ResponseEntity<List<TaskDTO>> response = taskController.getAllTasks();
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return List.of();
        }
        return response.getBody();
    }

    private Integer extractTaskIdFromAction(String commandText, String actionLabel) {
        if (commandText == null || commandText.isBlank()) {
            return null;
        }

        String suffix = BotLabels.DASH.getLabel() + actionLabel;
        if (!commandText.endsWith(suffix)) {
            return null;
        }

        String idToken = commandText.substring(0, commandText.length() - suffix.length()).trim();
        if (idToken.isBlank()) {
            return null;
        }

        try {
            return Integer.parseInt(idToken);
        } catch (NumberFormatException ex) {
            logger.warn("Invalid task action id token: {}", idToken);
            return null;
        }
    }

    private String extractCreatePayload(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return null;
        }

        String trimmed = rawText.trim();
        if (trimmed.equals(BotLabels.ADD_NEW_ITEM.getLabel()) ||
            trimmed.equals(BotCommands.ADD_ITEM.getCommand()) ||
            trimmed.equals(BotCommands.ADD_TASK.getCommand())) {
            return null;
        }

        if (trimmed.startsWith(BotCommands.ADD_ITEM.getCommand() + " ")) {
            return trimmed.substring(BotCommands.ADD_ITEM.getCommand().length()).trim();
        }

        if (trimmed.startsWith(BotCommands.ADD_TASK.getCommand() + " ")) {
            return trimmed.substring(BotCommands.ADD_TASK.getCommand().length()).trim();
        }

        return trimmed;
    }

    private TaskDTO buildTaskFromPayload(String payload) {
        String cleanedPayload = payload != null ? payload.trim() : "";
        if (cleanedPayload.isBlank()) {
            throw new IllegalArgumentException("Task title is required.");
        }

        String[] parts = cleanedPayload.split(FIELD_SEPARATOR_REGEX);
        String title = parts[0].trim();

        if (title.isBlank() || (parts.length == 1 && title.contains("="))) {
            throw new IllegalArgumentException("Task title is required before attributes.");
        }

        TaskDTO task = new TaskDTO();
        task.setTitle(title);

        for (int index = 1; index < parts.length; index++) {
            String field = parts[index].trim();
            if (field.isBlank()) {
                continue;
            }

            int separatorIndex = field.indexOf('=');
            if (separatorIndex <= 0 || separatorIndex >= field.length() - 1) {
                throw new IllegalArgumentException("Invalid attribute: " + field);
            }

            String key = field.substring(0, separatorIndex).trim().toLowerCase(Locale.ROOT);
            String value = field.substring(separatorIndex + 1).trim();

            switch (key) {
                case "description", "desc" -> task.setDescription(value);
                case "status" -> task.setStatus(normalizeStatus(value));
                case "priority", "prio" -> task.setPriority(normalizePriority(value));
                case "start", "startdate", "start_date" -> task.setStartDate(parseDateField(value, key));
                case "end", "enddate", "end_date" -> task.setEndDate(parseDateField(value, key));
                case "sprint" -> task.setSprintId(parseIntegerField(value, key));
                case "est", "estimated", "estimatedtime", "estimated_time" -> task.setEstimatedTime(parseDoubleField(value, key));
                case "real", "realtime", "real_time" -> task.setRealTime(parseDoubleField(value, key));
                case "assignee", "assignedto", "assigned_to", "username", "user" -> task.setAssignedTo(List.of(value));
                default -> throw new IllegalArgumentException("Unknown attribute: " + key);
            }
        }

        return task;
    }

    private void resolveSprintNumberReference(TaskDTO task) {
        if (task == null || task.getSprintId() == null || sprintController == null) {
            return;
        }

        Integer requestedSprintNumber = task.getSprintId();
        List<SprintOptionDTO> availableSprints = sprintController.listSprints(null);
        if (availableSprints == null || availableSprints.isEmpty()) {
            throw new IllegalArgumentException("No sprints available. Create a sprint first.");
        }

        List<SprintOptionDTO> bySprintNumber = availableSprints.stream()
                .filter(sprint -> sprint.getSprintNumber() == requestedSprintNumber)
                .toList();

        if (bySprintNumber.size() == 1) {
            task.setSprintId(bySprintNumber.get(0).getIdSprint());
            return;
        }

        String validSprintNumbers = availableSprints.stream()
                .map(sprint -> String.valueOf(sprint.getSprintNumber()))
                .distinct()
                .collect(Collectors.joining(", "));

        throw new IllegalArgumentException("Invalid sprint number: " + requestedSprintNumber + ". Valid sprint numbers: " + validSprintNumbers);
    }

    private String buildCreateTaskClientErrorMessage(TaskDTO taskRequest) {
        StringBuilder message = new StringBuilder(BotMessages.TASK_OPERATION_FAILED.getMessage());

        if (taskRequest != null && taskRequest.getSprintId() != null && sprintController != null) {
            List<SprintOptionDTO> availableSprints = sprintController.listSprints(null);
            if (availableSprints != null && !availableSprints.isEmpty()) {
                String sprintHints = availableSprints.stream()
                        .map(sprint -> String.valueOf(sprint.getSprintNumber()))
                        .distinct()
                        .collect(Collectors.joining(", "));
                message.append("\nValid sprint numbers: ").append(sprintHints);
            }
        }

        ResponseEntity<List<TaskAssigneeOptionDTO>> usersResponse = taskController.getProjectUsers(null);
        if (usersResponse.getStatusCode().is2xxSuccessful() && usersResponse.getBody() != null && !usersResponse.getBody().isEmpty()) {
            String userHints = usersResponse.getBody().stream()
                    .map(TaskAssigneeOptionDTO::getUsername)
                    .filter(username -> username != null && !username.isBlank())
                    .collect(Collectors.joining(", "));
            if (!userHints.isBlank()) {
                message.append("\nValid assignee usernames: ").append(userHints);
            }
        }

        return truncate(message.toString(), 700);
    }

    private String normalizeStatus(String statusRaw) {
        String normalized = statusRaw.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        return switch (normalized) {
            case "backlog", "ready", "in-progress", "review", "done" -> normalized;
            case "inprogress" -> "in-progress";
            default -> throw new IllegalArgumentException("Invalid status: " + statusRaw);
        };
    }

    private String normalizePriority(String priorityRaw) {
        String normalized = priorityRaw.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "low", "medium", "high" -> normalized;
            default -> throw new IllegalArgumentException("Invalid priority: " + priorityRaw);
        };
    }

    private Integer parseIntegerField(String rawValue, String fieldName) {
        try {
            return Integer.parseInt(rawValue.trim());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid integer for " + fieldName + ": " + rawValue);
        }
    }

    private Double parseDoubleField(String rawValue, String fieldName) {
        try {
            return Double.parseDouble(rawValue.trim());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid number for " + fieldName + ": " + rawValue);
        }
    }

    private String parseDateField(String rawValue, String fieldName) {
        String trimmed = rawValue.trim();
        if (!trimmed.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            throw new IllegalArgumentException("Invalid date for " + fieldName + ". Use YYYY-MM-DD");
        }
        return trimmed;
    }

    private String formatTaskButtonLabel(TaskDTO task) {
        String title = safeValue(task.getTitle(), "Untitled");
        String status = safeValue(task.getStatus(), "backlog");
        String priority = safeValue(task.getPriority(), "medium");
        String sprint = task.getSprintId() != null ? "S" + task.getSprintId() : "S-";
        String assignee = safeValue(task.getAssignedUsername(), firstAssignee(task.getAssignedTo()));
        if (assignee == null || assignee.isBlank()) {
            assignee = "unassigned";
        }

        String label = "#" + task.getId() + " " + title + " [" + status + "|" + priority + "|" + sprint + "|" + assignee + "]";
        return truncate(label, 58);
    }

    private String buildTaskListHeader(int activeCount, int doneCount) {
        return BotLabels.MY_TODO_LIST.getLabel() + "\n" +
                "Active: " + activeCount + " | Done: " + doneCount + "\n" +
                "Use /addtask title | priority=medium | sprint=2 | start=YYYY-MM-DD | end=YYYY-MM-DD | est=4 | real=0 | assignee=username";
    }

    private String buildCreatedTaskSummary(TaskDTO task) {
        String taskId = safeValue(task.getId(), "-");
        String title = safeValue(task.getTitle(), "Untitled");
        String status = safeValue(task.getStatus(), "backlog");
        String priority = safeValue(task.getPriority(), "medium");
        String sprint = task.getSprintId() != null ? String.valueOf(task.getSprintId()) : "none";
        String startDate = safeValue(task.getStartDate(), "-");
        String endDate = safeValue(task.getEndDate(), "-");
        String est = String.valueOf(task.getEstimatedTime());
        String real = String.valueOf(task.getRealTime());

        return "#" + taskId + " " + title + "\n" +
                "status=" + status + ", priority=" + priority + ", sprint=" + sprint + "\n" +
                "start=" + startDate + ", end=" + endDate + ", est=" + est + ", real=" + real;
    }

    private String firstAssignee(List<String> assignedTo) {
        if (assignedTo == null || assignedTo.isEmpty()) {
            return null;
        }
        for (String entry : assignedTo) {
            if (entry != null && !entry.isBlank()) {
                return entry;
            }
        }
        return null;
    }

    private String safeValue(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, Math.max(0, maxLength - 3)) + "...";
    }
}
