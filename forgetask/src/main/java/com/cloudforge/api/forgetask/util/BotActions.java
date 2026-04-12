package com.cloudforge.api.forgetask.util;

import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class BotActions {

    private static final Logger logger = LoggerFactory.getLogger(BotActions.class);

    private String requestText;
    private long chatId;
    private final TelegramClient telegramClient;
    private final JdbcTemplate jdbcTemplate;
    private boolean exit;

    public BotActions(TelegramClient tc, JdbcTemplate jt) {
        telegramClient = tc;
        jdbcTemplate = jt;
        exit = false;
    }

    public void setRequestText(String cmd) {
        requestText = cmd;
    }

    public void setChatId(long chId) {
        chatId = chId;
    }

    public void fnStart() {
        if (!(requestText.equals(BotCommands.START_COMMAND.getCommand()) || 
              requestText.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) || exit) {
            return;
        }

        BotHelper.sendMessageToTelegram(chatId, BotMessages.HELLO_MYTODO_BOT.getMessage(), telegramClient,
                ReplyKeyboardMarkup.builder()
                        .keyboardRow(new KeyboardRow(BotLabels.LIST_ALL_ITEMS.getLabel(), BotLabels.ADD_NEW_ITEM.getLabel()))
                        .keyboardRow(new KeyboardRow(BotLabels.SHOW_MAIN_SCREEN.getLabel(), BotLabels.HIDE_MAIN_SCREEN.getLabel()))
                        .build()
        );
        exit = true;
    }

    public void fnDone() {
        if (!(requestText.indexOf(BotLabels.DONE.getLabel()) != -1) || exit) {
            return;
        }

        String done = requestText.substring(0, requestText.indexOf(BotLabels.DASH.getLabel()));
        Integer id = Integer.valueOf(done);

        try {
            // Update task status to 'done'
            jdbcTemplate.update(
                    "UPDATE TASK_STATE SET STATE = ? WHERE ID_TASK = ?",
                    "done",
                    id
            );
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ITEM_DONE.getMessage(), telegramClient);

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, "Error marking task as done.", telegramClient);
        }
        exit = true;
    }

    public void fnUndo() {
        if (requestText.indexOf(BotLabels.UNDO.getLabel()) == -1 || exit) {
            return;
        }

        String undo = requestText.substring(0, requestText.indexOf(BotLabels.DASH.getLabel()));
        Integer id = Integer.valueOf(undo);

        try {
            // Update task status back to active state (e.g., 'backlog')
            jdbcTemplate.update(
                    "UPDATE TASK_STATE SET STATE = ? WHERE ID_TASK = ?",
                    "backlog",
                    id
            );
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ITEM_UNDONE.getMessage(), telegramClient);

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, "Error undoing task.", telegramClient);
        }
        exit = true;
    }

    public void fnDelete() {
        if (requestText.indexOf(BotLabels.DELETE.getLabel()) == -1 || exit) {
            return;
        }

        String delete = requestText.substring(0, requestText.indexOf(BotLabels.DASH.getLabel()));
        Integer id = Integer.valueOf(delete);

        try {
            // Delete task and related records
            jdbcTemplate.update("DELETE FROM TASK_TAG WHERE ID_TASK = ?", id);
            jdbcTemplate.update("DELETE FROM TASK_STATE WHERE ID_TASK = ?", id);
            jdbcTemplate.update("DELETE FROM TASK WHERE ID_TASK = ?", id);
            
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ITEM_DELETED.getMessage(), telegramClient);

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, "Error deleting task.", telegramClient);
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
                currentRow.add(task.getTitle());
                currentRow.add(task.getId() + BotLabels.DASH.getLabel() + BotLabels.DONE.getLabel());
                keyboard.add(currentRow);
            }

            // Done tasks
            List<TaskDTO> doneTasks = allTasks.stream()
                    .filter(task -> "done".equalsIgnoreCase(task.getStatus()))
                    .collect(Collectors.toList());

            for (TaskDTO task : doneTasks) {
                KeyboardRow currentRow = new KeyboardRow();
                currentRow.add(task.getTitle());
                currentRow.add(task.getId() + BotLabels.DASH.getLabel() + BotLabels.UNDO.getLabel());
                currentRow.add(task.getId() + BotLabels.DASH.getLabel() + BotLabels.DELETE.getLabel());
                keyboard.add(currentRow);
            }

            // Command back to main screen
            KeyboardRow mainScreenRowBottom = new KeyboardRow();
            mainScreenRowBottom.add(BotLabels.SHOW_MAIN_SCREEN.getLabel());
            keyboard.add(mainScreenRowBottom);

            keyboardMarkup.setKeyboard(keyboard);

            BotHelper.sendMessageToTelegram(chatId, BotLabels.MY_TODO_LIST.getLabel(), telegramClient, keyboardMarkup);

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, "Error fetching task list.", telegramClient);
        }
        exit = true;
    }

    public void fnAddItem() {
        if (!(requestText.contains(BotCommands.ADD_ITEM.getCommand()) ||
              requestText.contains(BotLabels.ADD_NEW_ITEM.getLabel())) || exit) {
            return;
        }
        BotHelper.sendMessageToTelegram(chatId, BotMessages.TYPE_NEW_TODO_ITEM.getMessage(), telegramClient);
        exit = true;
    }

    public void fnElse() {
        if (exit) {
            return;
        }

        try {
            // Create new task with just the title from the message
            Integer nextId = jdbcTemplate.queryForObject("SELECT NVL(MAX(ID_TASK), 0) + 1 FROM TASK", Integer.class);
            if (nextId == null) {
                BotHelper.sendMessageToTelegram(chatId, "Error creating new task.", telegramClient);
                return;
            }

            String title = requestText;
            int defaultProjectId = 1; // Default project ID (adjust if needed)
            int defaultUserId = 1;    // Default user ID (adjust if needed)

            // Insert new task
            jdbcTemplate.update(
                    "INSERT INTO TASK (ID_TASK, ID_USER, ID_PROJECT, TITLE, START_TIME) VALUES (?, ?, ?, ?, ?)",
                    nextId,
                    defaultUserId,
                    defaultProjectId,
                    title,
                    new Timestamp(System.currentTimeMillis())
            );

            // Insert task state (default: backlog)
            jdbcTemplate.update(
                    "INSERT INTO TASK_STATE (ID_TASK, STATE) VALUES (?, ?)",
                    nextId,
                    "backlog"
            );

            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEW_ITEM_ADDED.getMessage(), telegramClient, null);

        } catch (Exception e) {
            logger.error(e.getLocalizedMessage(), e);
            BotHelper.sendMessageToTelegram(chatId, "Error adding new task.", telegramClient);
        }
    }

    // Helper methods
    private List<TaskDTO> getAllTasks() {
        String sql = """
            SELECT t.ID_TASK,
                   t.TITLE,
                   t.DESCRIPTION,
                   ts.STATE
            FROM TASK t
            LEFT JOIN TASK_STATE ts ON ts.ID_TASK = t.ID_TASK
            ORDER BY t.ID_TASK
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            TaskDTO task = new TaskDTO();
            task.setId(String.valueOf(rs.getInt("ID_TASK")));
            task.setTitle(rs.getString("TITLE"));
            task.setDescription(rs.getString("DESCRIPTION"));
            task.setStatus(rs.getString("STATE") != null ? rs.getString("STATE") : "backlog");
            return task;
        });
    }
}
