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

    // Clave usada en el contexto conversacional para almacenar el ID de la tarea
    // seleccionada durante el flujo de registro de horas.
    private static final String CTX_HOURS_TASK_ID = "hours_task_id";

    // Clave usada cuando el flujo de horas fue iniciado desde el boton DONE.
    // Al finalizar el ingreso de horas, la tarea se marca automaticamente como done.
    private static final String CTX_DONE_TASK_ID = "done_task_id";

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

    // -------------------------------------------------------------------------
    // Flujos existentes
    // -------------------------------------------------------------------------

    public void fnStart() {
        if (!(requestText.equals(BotCommands.START_COMMAND.getCommand()) ||
              requestText.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) || exit) {
            return;
        }

        BotHelper.sendMessageToTelegram(chatId, BotMessages.HELLO_MYTODO_BOT.getMessage(), telegramClient,
                ReplyKeyboardMarkup.builder()
                        .keyboardRow(new KeyboardRow(BotLabels.ADD_NEW_ITEM.getLabel()))
                        .keyboardRow(new KeyboardRow(BotLabels.LIST_ALL_ITEMS.getLabel()))
                        .build()
        );
        exit = true;
    }

    public void fnDone() {
        if (exit) return;

        Integer id = extractTaskIdFromAction(requestText, BotLabels.DONE.getLabel());
        if (id == null) return;

        // En lugar de marcar done directamente, iniciamos el flujo conversacional
        // para que el developer registre sus horas reales. Al confirmar las horas,
        // handleHoursInput detecta CTX_DONE_TASK_ID y hace ambas operaciones juntas:
        // actualizar REAL_TIME + cambiar estado a "done".
        try {
            TaskDTO task = taskController.getTaskById(String.valueOf(id)).getBody();
            if (task == null) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
                exit = true;
                return;
            }

            if (conversationManager != null) {
                // Ir directo a AWAITING_HOURS — la tarea ya esta seleccionada (boton DONE).
                // No pasar por AWAITING_TASK_SELECTION para evitar que el controller
                // enrute el siguiente mensaje a ConversationalTaskCreator.
                ConversationState state = conversationManager.getOrCreateConversation(chatId);
                state.reset();
                state.setContext(CTX_DONE_TASK_ID, String.valueOf(id));
                state.setCurrentStep(TaskCreationStep.AWAITING_HOURS);

                BotHelper.sendMessageToTelegram(chatId,
                        "Completando: *" + task.getTitle() + "*\n"
                        + "Horas reales actuales: " + safeDouble(task.getRealTime()) + "h\n\n"
                        + "Cuantas horas reales trabajaste en esta tarea? (ej: 2.5)",
                        telegramClient);
            } else {
                // Fallback: marcar done sin pedir horas
                if (applyStatusUpdate(id, "done")) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.ITEM_DONE.getMessage(), telegramClient);
                } else {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
                }
            }
        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }
        exit = true;
    }

    public void fnUndo() {
        if (exit) return;

        Integer id = extractTaskIdFromAction(requestText, BotLabels.UNDO.getLabel());
        if (id == null) return;

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
        if (exit) return;

        Integer id = extractTaskIdFromAction(requestText, BotLabels.DELETE.getLabel());
        if (id == null) return;

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
              requestText.equals(BotCommands.LIST_TASKS.getCommand()) ||
              requestText.equals(BotLabels.LIST_ALL_ITEMS.getLabel()) ||
              requestText.equals(BotLabels.MY_TODO_LIST.getLabel())) || exit) {
            return;
        }

        try {
            List<TaskDTO> allTasks = getAllTasks();
            List<KeyboardRow> keyboard = new ArrayList<>();

            KeyboardRow mainScreenRowTop = new KeyboardRow();
            mainScreenRowTop.add(BotLabels.SHOW_MAIN_SCREEN.getLabel());
            keyboard.add(mainScreenRowTop);

            KeyboardRow firstRow = new KeyboardRow();
            firstRow.add(BotLabels.ADD_NEW_ITEM.getLabel());
            keyboard.add(firstRow);

            KeyboardRow myTodoListTitleRow = new KeyboardRow();
            myTodoListTitleRow.add(BotLabels.MY_TODO_LIST.getLabel());
            keyboard.add(myTodoListTitleRow);

            // Tareas activas — boton DONE inicia flujo de horas antes de completar
            List<TaskDTO> activeTasks = allTasks.stream()
                    .filter(task -> !"done".equalsIgnoreCase(task.getStatus()))
                    .collect(Collectors.toList());

            for (TaskDTO task : activeTasks) {
                KeyboardRow currentRow = new KeyboardRow();
                currentRow.add(formatTaskButtonLabel(task));
                currentRow.add(task.getId() + BotLabels.DASH.getLabel() + BotLabels.DONE.getLabel());
                keyboard.add(currentRow);
            }

            // Tareas completadas
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

            KeyboardRow mainScreenRowBottom = new KeyboardRow();
            mainScreenRowBottom.add(BotLabels.SHOW_MAIN_SCREEN.getLabel());
            keyboard.add(mainScreenRowBottom);

            ReplyKeyboardMarkup keyboardMarkup = ReplyKeyboardMarkup.builder()
                    .keyboard(keyboard)
                    .resizeKeyboard(true)
                    .oneTimeKeyboard(false)
                    .selective(true)
                    .build();

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
        if (exit) return;

        if (!(requestText.equals(BotCommands.ADD_ITEM.getCommand()) ||
              requestText.equals(BotCommands.ADD_TASK.getCommand()) ||
              requestText.equals(BotLabels.ADD_NEW_ITEM.getLabel()) ||
              requestText.equals(BotLabels.TASK_FORMAT_HELP.getLabel()))) {
            return;
        }

        if (conversationManager != null) {
            conversationManager.startTaskCreation(chatId);
            BotHelper.sendMessageToTelegram(chatId,
                    "What is the title of the task?",
                    telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TYPE_NEW_TODO_ITEM.getMessage(), telegramClient);
        }
        exit = true;
    }

    // -------------------------------------------------------------------------
    // NUEVO: Iniciar flujo de registro de horas reales
    //
    // Triggered por: /loghours o boton "Log Hours"
    // Siguiente paso: fnHandleConversation() detecta AWAITING_TASK_SELECTION
    // -------------------------------------------------------------------------

    public void fnLogHours() {
        if (exit) return;

        if (!(requestText.equals(BotCommands.LOG_HOURS.getCommand()) ||
              requestText.equals(BotLabels.LOG_HOURS.getLabel()))) {
            return;
        }

        List<TaskDTO> activeTasks = getActiveTasks();

        if (activeTasks.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId,
                    "No hay tareas activas en el proyecto. Crea una tarea primero con /addtask.",
                    telegramClient);
            exit = true;
            return;
        }

        if (conversationManager != null) {
            conversationManager.startHoursLogging(chatId);
            BotHelper.sendMessageToTelegram(chatId,
                    buildTaskSelectionMenu(activeTasks),
                    telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }
        exit = true;
    }

    // -------------------------------------------------------------------------
    // NUEVO: Manejar respuestas dentro de flujos conversacionales activos
    //
    // Debe llamarse ANTES de fnElse() en el controller para interceptar
    // mensajes que son continuacion de un flujo activo (creacion de tarea
    // o registro de horas).
    // -------------------------------------------------------------------------

    public void fnHandleConversation() {
        if (exit || conversationManager == null) return;

        ConversationState state = conversationManager.getConversation(chatId);
        if (state == null) return;

        TaskCreationStep step = state.getCurrentStep();
        if (step == null || !step.isHoursFlow()) return;

        switch (step) {

            // --- Flujo de horas: el usuario elige la tarea ---
            case AWAITING_TASK_SELECTION -> {
                handleTaskSelectionInput(state);
                exit = true;
            }

            // --- Flujo de horas: el usuario escribe el numero de horas ---
            case AWAITING_HOURS -> {
                handleHoursInput(state);
                exit = true;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Continuacion del flujo de horas — paso 1: seleccion de tarea
    // -------------------------------------------------------------------------

    private void handleTaskSelectionInput(ConversationState state) {
        String input = requestText.trim();
        List<TaskDTO> activeTasks = getActiveTasks();

        if (activeTasks.isEmpty()) {
            conversationManager.cancelConversation(chatId);
            BotHelper.sendMessageToTelegram(chatId,
                    "Ya no hay tareas activas. El flujo fue cancelado.",
                    telegramClient);
            return;
        }

        // Acepta numero de opcion (1, 2, ...) o ID de tarea directo
        TaskDTO selected = null;

        try {
            int parsed = Integer.parseInt(input);

            // Intentar como indice (1-based) primero
            if (parsed >= 1 && parsed <= activeTasks.size()) {
                selected = activeTasks.get(parsed - 1);
            } else {
                // Intentar como ID de tarea directa
                final int taskId = parsed;
                selected = activeTasks.stream()
                        .filter(t -> t.getId() != null && t.getId().equals(String.valueOf(taskId)))
                        .findFirst()
                        .orElse(null);
            }

        } catch (NumberFormatException ignored) {
            // Intentar por titulo parcial (case-insensitive)
            String lowerInput = input.toLowerCase(Locale.ROOT);
            selected = activeTasks.stream()
                    .filter(t -> t.getTitle() != null &&
                                 t.getTitle().toLowerCase(Locale.ROOT).contains(lowerInput))
                    .findFirst()
                    .orElse(null);
        }

        if (selected == null) {
            BotHelper.sendMessageToTelegram(chatId,
                    "No encontre esa tarea. Responde con el numero de la lista o parte del titulo:\n\n"
                    + buildTaskSelectionMenu(activeTasks),
                    telegramClient);
            return;
        }

        // Guardar la tarea seleccionada y avanzar al siguiente paso
        state.setContext(CTX_HOURS_TASK_ID, selected.getId());
        conversationManager.nextStep(chatId, TaskCreationStep.AWAITING_HOURS);

        BotHelper.sendMessageToTelegram(chatId,
                "Tarea seleccionada: *" + selected.getTitle() + "*\n"
                + "Horas reales actuales: " + safeDouble(selected.getRealTime()) + "h\n\n"
                + "Cuantas horas reales trabajaste en esta tarea? (ej: 2.5)",
                telegramClient);
    }

    // -------------------------------------------------------------------------
    // Continuacion del flujo de horas — paso 2: ingreso de horas
    // -------------------------------------------------------------------------

    private void handleHoursInput(ConversationState state) {
        String input = requestText.trim();

        // Determinar si venimos del boton DONE o del comando /loghours
        String taskId = (String) state.getContext(CTX_DONE_TASK_ID);
        boolean markAsDone = taskId != null;
        if (!markAsDone) {
            taskId = (String) state.getContext(CTX_HOURS_TASK_ID);
        }

        if (taskId == null) {
            conversationManager.cancelConversation(chatId);
            BotHelper.sendMessageToTelegram(chatId,
                    "Ocurrio un error en el flujo. Intenta de nuevo.",
                    telegramClient);
            return;
        }

        double hours;
        try {
            hours = Double.parseDouble(input.replace(",", "."));
            if (hours < 0) throw new NumberFormatException("negative");
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Valor invalido. Ingresa un numero positivo de horas (ej: 1, 2.5, 0.5):",
                    telegramClient);
            return;
        }

        try {
            TaskDTO update = new TaskDTO();
            update.setRealTime(hours);
            if (markAsDone) {
                update.setStatus("done");
            }

            ResponseEntity<TaskDTO> response = taskController.updateTask(taskId, update);
            conversationManager.cancelConversation(chatId);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                TaskDTO updated = response.getBody();
                String confirmMsg = markAsDone
                        ? "Tarea completada.\n"
                          + "#" + updated.getId() + " " + safeValue(updated.getTitle(), "Tarea") + "\n"
                          + "Horas reales registradas: " + safeDouble(updated.getRealTime()) + "h"
                        : "Horas registradas correctamente.\n"
                          + "#" + updated.getId() + " " + safeValue(updated.getTitle(), "Tarea") + "\n"
                          + "Horas reales: " + safeDouble(updated.getRealTime()) + "h";
                BotHelper.sendMessageToTelegram(chatId, confirmMsg, telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
            }

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            conversationManager.cancelConversation(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.TASK_OPERATION_FAILED.getMessage(), telegramClient);
        }
    }

    // -------------------------------------------------------------------------
    // fnElse: crear tarea desde texto libre o comando /addtask
    // -------------------------------------------------------------------------

    public void fnElse() {
        if (exit) return;

        String payload = extractCreatePayload(requestText);
        if (payload == null) return;

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

    // -------------------------------------------------------------------------
    // Helpers privados
    // -------------------------------------------------------------------------

    private boolean applyStatusUpdate(int taskId, String status) {
        TaskDTO request = new TaskDTO();
        request.setStatus(status);
        ResponseEntity<TaskDTO> response = taskController.updateTask(String.valueOf(taskId), request);
        return response.getStatusCode().is2xxSuccessful() && response.getBody() != null;
    }

    private List<TaskDTO> getAllTasks() {
        ResponseEntity<List<TaskDTO>> response = taskController.getAllTasks();
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return List.of();
        }
        return response.getBody();
    }

    /**
     * Devuelve solo las tareas que NO estan en estado "done".
     * Usa los mismos estados validos del CHK_TASK_STATE de Oracle ATP:
     * backlog, ready, in_progress, review.
     */
    private List<TaskDTO> getActiveTasks() {
        return getAllTasks().stream()
                .filter(t -> !"done".equalsIgnoreCase(t.getStatus()))
                .collect(Collectors.toList());
    }

    /**
     * Construye el menu numerado de seleccion de tarea para el flujo /loghours.
     * Formato de cada linea:
     *   N. #ID titulo [sprint | horas actuales]
     */
    private String buildTaskSelectionMenu(List<TaskDTO> tasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("Selecciona la tarea para registrar horas.\n");
        sb.append("Responde con el numero o parte del titulo:\n\n");

        for (int i = 0; i < tasks.size(); i++) {
            TaskDTO t = tasks.get(i);
            String sprint = t.getSprintId() != null ? "S" + t.getSprintId() : "S-";
            String real = safeDouble(t.getRealTime()) + "h";
            sb.append(i + 1)
              .append(". #").append(safeValue(t.getId(), "?"))
              .append(" ").append(safeValue(t.getTitle(), "Untitled"))
              .append(" [").append(sprint).append(" | ").append(real).append("]")
              .append("\n");
        }
        return sb.toString().trim();
    }

    private Integer extractTaskIdFromAction(String commandText, String actionLabel) {
        if (commandText == null || commandText.isBlank()) return null;

        String suffix = BotLabels.DASH.getLabel() + actionLabel;
        if (!commandText.endsWith(suffix)) return null;

        String idToken = commandText.substring(0, commandText.length() - suffix.length()).trim();
        if (idToken.isBlank()) return null;

        try {
            return Integer.parseInt(idToken);
        } catch (NumberFormatException ex) {
            logger.warn("Invalid task action id token: {}", idToken);
            return null;
        }
    }

    private String extractCreatePayload(String rawText) {
        if (rawText == null || rawText.isBlank()) return null;

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

            if (field.isBlank()) continue;

            int separatorIndex = field.indexOf('=');
            if (separatorIndex <= 0 || separatorIndex >= field.length() - 1) {
                throw new IllegalArgumentException("Invalid attribute: " + field);
            }

            String key = field.substring(0, separatorIndex).trim().toLowerCase(Locale.ROOT);
            String value = field.substring(separatorIndex + 1).trim();

            switch (key) {
                case "description", "desc"                             -> task.setDescription(value);
                case "status"                                          -> task.setStatus(normalizeStatus(value));
                case "priority", "prio"                                -> task.setPriority(normalizePriority(value));
                case "start", "startdate", "start_date"                -> task.setStartDate(parseDateField(value, key));
                case "end", "enddate", "end_date"                      -> task.setEndDate(parseDateField(value, key));
                case "sprint"                                          -> task.setSprintId(parseIntegerField(value, key));
                case "est", "estimated", "estimatedtime", "estimated_time" -> task.setEstimatedTime(parseDoubleField(value, key));
                case "real", "realtime", "real_time"                   -> task.setRealTime(parseDoubleField(value, key));
                case "assignee", "assignedto", "assigned_to", "username", "user" -> task.setAssignedTo(List.of(value));
                default -> throw new IllegalArgumentException("Unknown attribute: " + key);
            }
        }

        return task;
    }

    private void resolveSprintNumberReference(TaskDTO task) {
        if (task == null || task.getSprintId() == null || sprintController == null) return;

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

        throw new IllegalArgumentException(
                "Invalid sprint number: " + requestedSprintNumber + ". Valid sprint numbers: " + validSprintNumbers);
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
        if (usersResponse.getStatusCode().is2xxSuccessful() && usersResponse.getBody() != null
                && !usersResponse.getBody().isEmpty()) {
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

    private String buildTaskListHeader(int activeCount, int doneCount) {
        return BotLabels.MY_TODO_LIST.getLabel() + "\n" +
                "Active: " + activeCount + " | Done: " + doneCount + "\n" +
                "Use /addtask to register a task or with the 'Add New Item' button\n"
                + "'List All Items' to view all tasks or use /todolist, complete/delete tasks, and log actual hours\r\n";
    }


    private String buildCreatedTaskSummary(TaskDTO task) {
        String taskId    = safeValue(task.getId(), "-");
        String title     = safeValue(task.getTitle(), "Untitled");
        String status    = safeValue(task.getStatus(), "backlog");
        String priority  = safeValue(task.getPriority(), "medium");
        String sprint    = task.getSprintId() != null ? String.valueOf(task.getSprintId()) : "none";
        String startDate = safeValue(task.getStartDate(), "-");
        String endDate   = safeValue(task.getEndDate(), "-");
        String est       = safeDouble(task.getEstimatedTime()) + "h";
        String real      = safeDouble(task.getRealTime()) + "h";

        return "#" + taskId + " " + title + "\n"
                + "status=" + status + ", priority=" + priority + ", sprint=" + sprint + "\n"
                + "start=" + startDate + ", end=" + endDate + ", est=" + est + ", real=" + real;
    }

    private String formatTaskButtonLabel(TaskDTO task) {
        // Telegram limita el markup total a ~4KB.
        // Mantenemos el label minimo: solo id y titulo truncado.
        String title = safeValue(task.getTitle(), "Untitled");
        String label = "#" + task.getId() + " " + title;
        return truncate(label, 40);
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

    private String firstAssignee(List<String> assignedTo) {
        if (assignedTo == null || assignedTo.isEmpty()) return null;
        for (String entry : assignedTo) {
            if (entry != null && !entry.isBlank()) return entry;
        }
        return null;
    }

    private String safeValue(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private String safeDouble(Double value) {
        return value != null ? String.valueOf(value) : "0.0";
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) return value;
        return value.substring(0, Math.max(0, maxLength - 3)) + "...";
    }
}