package com.cloudforge.api.forgetask.config;

import org.telegram.telegrambots.meta.generics.TelegramClient;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class TelegramBotClientConfig {

    @Bean
    public TelegramClient telegramClient(TelegramBotConfig telegramBotConfig) {
        return new OkHttpTelegramClient(telegramBotConfig.getToken());
    }
}
