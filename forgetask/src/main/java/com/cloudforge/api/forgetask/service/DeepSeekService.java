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
import java.util.List;
import java.util.Map;

@Service
public class DeepSeekService {

    private static final Logger logger = LoggerFactory.getLogger(DeepSeekService.class);

    private final DeepSeekConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DeepSeekService(DeepSeekConfig config, HttpClient deepSeekHttpClient, ObjectMapper objectMapper) {
        this.config = config;
        this.httpClient = deepSeekHttpClient;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return config.isConfigured();
    }

    /**
     * Sends the given user prompt to the DeepSeek chat completions API and returns
     * the assistant's reply text.
     *
     * @param prompt the user's message to send to the LLM
     * @return the assistant reply extracted from the API response
     * @throws IOException          if a network or serialization error occurs
     * @throws InterruptedException if the HTTP request is interrupted
     */
    public String generateText(String prompt) throws IOException, InterruptedException {
        String requestBody = objectMapper.writeValueAsString(Map.of(
                "model", config.getModel(),
                "messages", List.of(Map.of("role", "user", "content", prompt))
        ));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(config.getUrl()))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + config.getKey())
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            logger.error("DeepSeek API returned HTTP {}: {}", response.statusCode(), response.body());
            throw new IOException("DeepSeek API error: HTTP " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.at("/choices/0/message/content").asText(null);

        if (content == null || content.isBlank()) {
            logger.error("DeepSeek API returned empty content. Full response: {}", response.body());
            throw new IOException("DeepSeek API returned an empty response.");
        }

        return content;
    }
}
