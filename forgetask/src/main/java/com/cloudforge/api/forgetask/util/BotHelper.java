package com.cloudforge.api.forgetask.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardRemove;
import org.telegram.telegrambots.meta.generics.TelegramClient;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;

public class BotHelper {

	private static final Logger logger = LoggerFactory.getLogger(BotHelper.class);

	public static void sendMessageToTelegram(Long chatId, String text, TelegramClient bot) {

		try {
			// prepare message
			SendMessage messageToTelegram = 
					SendMessage
					.builder()
					.chatId(chatId)
					.text(text)
					.replyMarkup(new ReplyKeyboardRemove(true))
					.build()
				;

			// send message
			bot.execute(messageToTelegram);

		} catch (Exception e) {
			logger.error(e.getLocalizedMessage(), e);
		}
	}

	public static void sendMessageToTelegram(Long chatId, String text,TelegramClient bot, ReplyKeyboardMarkup rk ) {

		try {
			// prepare message
			SendMessage.SendMessageBuilder messageBuilder =
					SendMessage
					.builder()
					.chatId(chatId)
					.text(text);

			if (rk != null) {
				messageBuilder.replyMarkup(rk);
			} else {
				messageBuilder.replyMarkup(new ReplyKeyboardRemove(true));
			}

			SendMessage messageToTelegram = messageBuilder.build();

			// send message
			bot.execute(messageToTelegram);

		} catch (Exception e) {
			logger.error(e.getLocalizedMessage(), e);
		}
	}

}
