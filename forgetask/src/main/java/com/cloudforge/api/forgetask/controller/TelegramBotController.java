package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.config.TelegramBotConfig;
import com.cloudforge.api.forgetask.util.BotActions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.longpolling.BotSession;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.AfterBotRegistration;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.generics.TelegramClient;

@Component
public class TelegramBotController implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

	private static final Logger logger = LoggerFactory.getLogger(TelegramBotController.class);
	private final JdbcTemplate jdbcTemplate;
	private final TelegramClient telegramClient;
	private final TelegramBotConfig telegramBotConfig;

	@Value("${telegram.bot.token}")
	private String telegramBotToken;

	public TelegramBotController(TelegramBotConfig telegramBotConfig, JdbcTemplate jdbcTemplate, TelegramClient telegramClient) {
		this.telegramBotConfig = telegramBotConfig;
		this.jdbcTemplate = jdbcTemplate;
		this.telegramClient = telegramClient;
	}

	@Override
	public String getBotToken() {
		if (telegramBotToken != null && !telegramBotToken.trim().isEmpty()) {
			return telegramBotToken;
		} else {
			return telegramBotConfig.getToken();
		}
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
		long chatId = update.getMessage().getChatId();

		BotActions actions = new BotActions(telegramClient, jdbcTemplate);
		actions.setRequestText(messageTextFromTelegram);
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
