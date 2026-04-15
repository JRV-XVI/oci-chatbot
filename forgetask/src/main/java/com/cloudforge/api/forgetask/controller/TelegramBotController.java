package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.config.TelegramBotConfig;
import com.cloudforge.api.forgetask.util.BotActions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.longpolling.BotSession;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.AfterBotRegistration;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.generics.TelegramClient;

@Component
@ConditionalOnProperty(prefix = "telegram.bot", name = "enabled", havingValue = "true")
public class TelegramBotController implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

	private static final Logger logger = LoggerFactory.getLogger(TelegramBotController.class);
	private final TaskController taskController;
	private final SprintController sprintController;
	private final TelegramClient telegramClient;
	private final TelegramBotConfig telegramBotConfig;

	public TelegramBotController(TelegramBotConfig telegramBotConfig, TaskController taskController, SprintController sprintController, TelegramClient telegramClient) {
		this.telegramBotConfig = telegramBotConfig;
		this.taskController = taskController;
		this.sprintController = sprintController;
		this.telegramClient = telegramClient;
	}

	@Override
	public String getBotToken() {
		return telegramBotConfig.getToken();
	}

	@Override
	public LongPollingUpdateConsumer getUpdatesConsumer() {
		return this;
	}

	@Override
	public void consume(Update update) {
		if (!update.hasMessage() || !update.getMessage().hasText()) {
			return;
		}

		String messageTextFromTelegram = update.getMessage().getText();
		if (messageTextFromTelegram == null || messageTextFromTelegram.isBlank()) {
			return;
		}

		long chatId = update.getMessage().getChatId();

		BotActions actions = new BotActions(telegramClient, taskController, sprintController);
		actions.setRequestText(messageTextFromTelegram.trim());
		actions.setChatId(chatId);

		// Execute bot action chain
		actions.fnStart();
		actions.fnDone();
		actions.fnUndo();
		actions.fnDelete();
		actions.fnHide();
		actions.fnListAll();
		actions.fnAddItem();
		actions.fnElse();
	}

	@AfterBotRegistration
	public void afterRegistration(BotSession botSession) {
		logger.info("Telegram bot registered and running state is: " + botSession.isRunning());
	}

}
