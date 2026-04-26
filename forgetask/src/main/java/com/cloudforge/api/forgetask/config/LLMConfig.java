package com.cloudforge.api.forgetask.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration for LLM provider (Groq, DeepSeek, etc.)
 */
@Component
@ConfigurationProperties(prefix = "llm")
public class LLMConfig {
    private String provider;      // "groq" or "deepseek"
    private String apiKey;
    private String model;         // "mixtral-8x7b" for Groq
    private String apiUrl;        // Groq: https://api.groq.com/openai/v1/
    private int maxTokens = 2048;
    private double temperature = 0.7;

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getApiUrl() {
        return apiUrl;
    }

    public void setApiUrl(String apiUrl) {
        this.apiUrl = apiUrl;
    }

    public int getMaxTokens() {
        return maxTokens;
    }

    public void setMaxTokens(int maxTokens) {
        this.maxTokens = maxTokens;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public boolean isConfigured() {
        return provider != null && apiKey != null && !apiKey.isBlank();
    }
}
