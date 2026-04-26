package com.cloudforge.api.forgetask.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpClient;

@Configuration
@ConfigurationProperties(prefix = "deepseek.api")
public class DeepSeekConfig {

    private static final String DUMMY_API_KEY = "sk-test";

    private String key;
    private String url = "https://api.deepseek.com/v1/chat/completions";
    private String model = "deepseek-chat";

    @Bean
    public HttpClient deepSeekHttpClient() {
        return HttpClient.newHttpClient();
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public boolean isConfigured() {
        return key != null && !key.isBlank()
                && !key.equals(DUMMY_API_KEY)
                && !(key.startsWith("${") && key.endsWith("}"));
    }
}
