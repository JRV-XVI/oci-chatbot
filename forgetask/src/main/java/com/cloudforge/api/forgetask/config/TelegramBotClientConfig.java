package com.cloudforge.api.forgetask.config;

import org.telegram.telegrambots.meta.generics.TelegramClient;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;


@Configuration
@ConditionalOnProperty(prefix = "telegram.bot", name = "enabled", havingValue = "true")
public class TelegramBotClientConfig {

    @Bean
    public TelegramClient telegramClient(TelegramBotConfig telegramBotConfig) {
        if (!telegramBotConfig.hasToken()) {
            throw new IllegalStateException("Telegram bot token is not configured. Set TELEGRAM_BOT_TOKEN in .env");
        }
        return new OkHttpTelegramClient(telegramBotConfig.getToken());
    }
}
