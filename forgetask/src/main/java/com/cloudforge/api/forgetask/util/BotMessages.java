package com.cloudforge.api.forgetask.util;

public enum BotMessages {
	
	HELLO_MYTODO_BOT(
	"Hello! I'm ForgeTask Bot!\nType a new task below and press the send button (blue arrow), or select an option below:"),
	BOT_REGISTERED_STARTED("Bot registered and started successfully!"),
	ITEM_DONE("Task marked as done! Select /todolist to return to the list of tasks, or /start to go to the main screen."), 
	ITEM_UNDONE("Task marked as undone! Select /todolist to return to the list of tasks, or /start to go to the main screen."), 
	ITEM_DELETED("Task deleted! Select /todolist to return to the list of tasks, or /start to go to the main screen."),
	TYPE_NEW_TODO_ITEM("Type a new task below and press the send button (blue arrow) on the right-hand side."),
	NEW_ITEM_ADDED("New task added! Select /todolist to return to the list of tasks, or /start to go to the main screen."),
	BYE("Bye! Select /start to resume!");

	private String message;

	BotMessages(String enumMessage) {
		this.message = enumMessage;
	}

	public String getMessage() {
		return message;
	}

}
