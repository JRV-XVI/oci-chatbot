package com.cloudforge.api.forgetask.util;

public enum BotCommands {

	START_COMMAND("/start"),
	HIDE_COMMAND("/hide"),
	TODO_LIST("/todolist"),
	ADD_ITEM("/additem"),
	ADD_TASK("/addtask"),
	LIST_TASKS("/tasks"),
	LOG_HOURS("/loghours"),
	LLM_REQ("/llm");

	private String command;

	BotCommands(String enumCommand) {
		this.command = enumCommand;
	}

	public String getCommand() {
		return command;
	}
}