package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.config.DeepSeekConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Service that calls the DeepSeek LLM API to generate text responses.
 * Uses Java's built-in HttpClient (Java 11+) — no extra dependencies needed.
 */
@Service
public class DeepSeekService {

    private static final Logger logger = LoggerFactory.getLogger(DeepSeekService.class);

    private final DeepSeekConfig deepSeekConfig;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DeepSeekService(DeepSeekConfig deepSeekConfig) {
        this.deepSeekConfig = deepSeekConfig;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Sends a prompt to the DeepSeek API and returns the generated text.
     *
     * @param prompt the user prompt to send
     * @return generated text from the LLM, or an error message if unavailable
     */
    public String generateText(String prompt) {
        if (!deepSeekConfig.isConfigured()) {
            logger.warn("DeepSeek API key not configured. Returning fallback message.");
            return "AI service is not configured. Please set DEEPSEEK_API_KEY.";
        }

        try {
            String requestBody = buildRequestBody(prompt);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(deepSeekConfig.getApiUrl()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + deepSeekConfig.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                logger.error("DeepSeek API returned status {}: {}", response.statusCode(), response.body());
                return "AI service returned an error. Please try again later.";
            }

            return extractContent(response.body());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("DeepSeek request interrupted", e);
            return "AI request was interrupted. Please try again.";
        } catch (IOException e) {
            logger.error("Error calling DeepSeek API", e);
            return "AI service is temporarily unavailable. Please try again later.";
        }
    }

    private String buildRequestBody(String prompt) throws IOException {
        String escapedPrompt = objectMapper.writeValueAsString(prompt);
        return String.format(
                "{\"model\":\"%s\",\"messages\":[{\"role\":\"user\",\"content\":%s}],\"max_tokens\":1024}",
                deepSeekConfig.getModel(),
                escapedPrompt
        );
    }

    private String extractContent(String responseBody) throws IOException {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode choices = root.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            JsonNode message = choices.get(0).path("message");
            String content = message.path("content").asText(null);
            if (content != null && !content.isBlank()) {
                return content;
            }
        }
        logger.warn("Unexpected DeepSeek response format: {}", responseBody);
        return "AI returned an unexpected response format.";
    }
}
