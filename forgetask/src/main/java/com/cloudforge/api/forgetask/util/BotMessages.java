package com.cloudforge.api.forgetask.util;

public enum BotMessages {
	
	HELLO_MYTODO_BOT(
	"Hello! I'm ForgeTask Bot!\nCreate tasks with plain text or use /addtask title | priority=high | sprint=2 | start=2026-04-14 | end=2026-04-20 | est=6 | real=2 | assignee=username"),
	BOT_REGISTERED_STARTED("Bot registered and started successfully!"),
	ITEM_DONE("Task marked as done. Use /todolist to refresh the task board."), 
	ITEM_UNDONE("Task moved back to backlog. Use /todolist to refresh the task board."), 
	ITEM_DELETED("Task deleted. Use /todolist to refresh the task board."),
	TYPE_NEW_TODO_ITEM("Send the task title, or use:\n/addtask title | priority=medium | sprint=2 | start=YYYY-MM-DD | end=YYYY-MM-DD | est=4 | real=0 | assignee=username"),
	NEW_ITEM_ADDED("Task created successfully."),
	INVALID_TASK_FORMAT("Invalid task format. Example:\n/addtask API docs | priority=high | sprint=2 | start=2026-04-14 | end=2026-04-20 | est=6 | assignee=jane"),
	TASK_OPERATION_FAILED("Task operation failed. Please verify task id and attributes."),
	BYE("Bye! Select /start to resume!");

	private String message;

	BotMessages(String enumMessage) {
		this.message = enumMessage;
	}

	public String getMessage() {
		return message;
	}

}
