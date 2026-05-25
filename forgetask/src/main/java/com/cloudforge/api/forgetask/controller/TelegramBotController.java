package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.config.TelegramBotConfig;
import com.cloudforge.api.forgetask.service.TelegramReportService;
import com.cloudforge.api.forgetask.util.BotActions;
import com.cloudforge.api.forgetask.util.ConversationManager;
import com.cloudforge.api.forgetask.util.ConversationState;
import com.cloudforge.api.forgetask.util.ConversationalTaskCreator;
import com.cloudforge.api.forgetask.util.TaskCreationStep;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
	private final ConversationManager conversationManager;
	private final TelegramReportService telegramReportService;
	private final String podNamespace;

	public TelegramBotController(TelegramBotConfig telegramBotConfig, TaskController taskController,
	                             SprintController sprintController, TelegramClient telegramClient,
	                             ConversationManager conversationManager, TelegramReportService telegramReportService,
	                             @Value("${POD_NAMESPACE:unknown}") String podNamespace) {
		this.telegramBotConfig = telegramBotConfig;
		this.taskController = taskController;
		this.sprintController = sprintController;
		this.telegramClient = telegramClient;
		this.conversationManager = conversationManager;
		this.telegramReportService = telegramReportService;
		this.podNamespace = podNamespace;
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

		String messageText = update.getMessage().getText();
		if (messageText == null || messageText.isBlank()) {
			return;
		}

		long chatId = update.getMessage().getChatId();
		String trimmedText = messageText.trim();

		ConversationState conversationState = conversationManager.getOrCreateConversation(chatId);
		TaskCreationStep currentStep = conversationState.getCurrentStep();

		// --- Flujo de creacion de tarea (ConversationalTaskCreator) -----------
		// Intercepta cuando el usuario esta en cualquier paso de creacion
		// de tarea, excepto NONE y los pasos del flujo de horas.
		if (currentStep != TaskCreationStep.NONE && !currentStep.isHoursFlow()) {
			ConversationalTaskCreator creator = new ConversationalTaskCreator(
					telegramClient, taskController, sprintController, conversationState);
			creator.processMessage(trimmedText);
			return;
		}

		// --- Flujo de horas y comandos normales (BotActions) ------------------
		// El flujo de horas (AWAITING_TASK_SELECTION, AWAITING_HOURS) y todos
		// los comandos normales pasan por la cadena de BotActions.
		BotActions actions = new BotActions(telegramClient, taskController, sprintController, telegramReportService);
		actions.setRequestText(trimmedText);
		actions.setChatId(chatId);
		actions.setConversationManager(conversationManager);

		// Cadena de responsabilidad. Orden importante:
		//   1. Comandos de menu principal (fnStart, fnHide)
		//   2. Acciones sobre tareas existentes (fnDone, fnUndo, fnDelete)
		//   3. Listado de tareas
		//   4. Generacion de reportes (fnGenerateReport)
		//   5. Inicio de flujos conversacionales (fnAddItem, fnLogHours)
		//   6. Continuacion de flujos activos (fnHandleConversation) — ANTES de fnElse
		//   7. Creacion de tarea via texto libre (fnElse)
		actions.fnStart();
		actions.fnHide();
		actions.fnDone();
		actions.fnUndo();
		actions.fnDelete();
		actions.fnListAll();
		actions.fnGenerateReport();
		actions.fnAddItem();
		actions.fnLogHours();
		actions.fnHandleConversation();
		actions.fnElse();
	}

	@AfterBotRegistration
	public void afterRegistration(BotSession botSession) {
		logger.info("Telegram bot registered (namespace={}, botName={}) and running state is: {}",
				podNamespace,
				telegramBotConfig.getName(),
				botSession.isRunning());
		logger.info("If you see Telegram 409 conflicts, ensure only ONE namespace/pod is running long polling for this bot token (common in blue/green).");
	}
}