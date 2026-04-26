package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.controller.TaskController;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.meta.api.methods.send.SendDocument;
import org.telegram.telegrambots.meta.api.objects.InputFile;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service to generate and send reports via Telegram
 */
@Service
public class TelegramReportService {
    private static final Logger logger = LoggerFactory.getLogger(TelegramReportService.class);

    private final ReportGeneratorService reportGeneratorService;
    private final PDFGeneratorService pdfGeneratorService;
    private final TaskController taskController;

    public TelegramReportService(
        ReportGeneratorService reportGeneratorService,
        PDFGeneratorService pdfGeneratorService,
        TaskController taskController
    ) {
        this.reportGeneratorService = reportGeneratorService;
        this.pdfGeneratorService = pdfGeneratorService;
        this.taskController = taskController;
    }

    /**
     * Generate report and send it as PDF via Telegram
     * @param chatId Telegram chat ID
     * @param projectId Project identifier
     * @param sprintId Sprint identifier  
     * @param telegramClient TelegramClient to send message
     */
    public void generateAndSendReport(long chatId, Integer projectId, Integer sprintId, TelegramClient telegramClient) {
        try {
            logger.info("Generating report for Telegram. Project: {}, Sprint: {}", projectId, sprintId);

            // Get all tasks
            List<TaskDTO> tasks = null;
            var tasksResponse = taskController.getAllTasks();
            if (tasksResponse.getStatusCode().is2xxSuccessful()) {
                tasks = tasksResponse.getBody();
            }

            if (tasks == null || tasks.isEmpty()) {
                sendMessage(chatId, "❌ No tasks found to generate report.", telegramClient);
                return;
            }

            // Generate report content
            sendMessage(chatId, "⏳ Generating AI report... Please wait.", telegramClient);
            String reportContent = reportGeneratorService.generateManagementReport(projectId, sprintId, tasks);

            // Generate PDF
            byte[] pdfBytes = pdfGeneratorService.generatePDF(reportContent, projectId, sprintId);

            // Generate filename
            String filename = pdfGeneratorService.generateFilename(projectId, sprintId);

            // Send PDF to Telegram
            sendPDFDocument(chatId, filename, pdfBytes, telegramClient);

            logger.info("Report sent successfully to chat: {}", chatId);

        } catch (Exception e) {
            logger.error("Error generating/sending report to Telegram: {}", e.getMessage(), e);
            sendMessage(chatId, "❌ Error generating report: " + e.getMessage(), telegramClient);
        }
    }

    /**
     * Send PDF document via Telegram
     */
    private void sendPDFDocument(long chatId, String filename, byte[] fileBytes, TelegramClient telegramClient) {
        try {
            InputFile inputFile = new InputFile(new ByteArrayInputStream(fileBytes), filename);
            SendDocument sendDocument = SendDocument.builder()
                .chatId(chatId)
                .document(inputFile)
                .caption("📊 Management Report - " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                .parseMode("HTML")
                .build();

            telegramClient.executeAsync(sendDocument);
        } catch (Exception e) {
            logger.error("Error sending PDF document to Telegram: {}", e.getMessage(), e);
        }
    }

    /**
     * Send text message via Telegram
     */
    private void sendMessage(long chatId, String text, TelegramClient telegramClient) {
        try {
            org.telegram.telegrambots.meta.api.methods.send.SendMessage message = 
                org.telegram.telegrambots.meta.api.methods.send.SendMessage.builder()
                .chatId(chatId)
                .text(text)
                .build();

            telegramClient.executeAsync(message);
        } catch (Exception e) {
            logger.error("Error sending message to Telegram: {}", e.getMessage(), e);
        }
    }
}
