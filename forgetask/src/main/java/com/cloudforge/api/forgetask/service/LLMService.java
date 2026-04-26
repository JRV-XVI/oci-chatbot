package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.config.LLMConfig;
import com.cloudforge.api.forgetask.dto.LLMChatCompletionDTO;
import com.cloudforge.api.forgetask.dto.LLMChatCompletionRequestDTO;
import com.cloudforge.api.forgetask.dto.LLMChatCompletionRequestDTO.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.util.ArrayList;
import java.util.List;

/**
 * Service to interact with LLM providers (Groq, DeepSeek)
 * Handles API calls and response parsing
 */
@Service
public class LLMService {
    private static final Logger logger = LoggerFactory.getLogger(LLMService.class);
    
    private final LLMConfig llmConfig;
    private final RestTemplate restTemplate;

    public LLMService(LLMConfig llmConfig, RestTemplate restTemplate) {
        this.llmConfig = llmConfig;
        this.restTemplate = restTemplate;
    }

    /**
     * Generate text content using configured LLM provider
     * @param prompt The prompt to send to the LLM
     * @return Generated text response
     */
    public String generateText(String prompt) throws Exception {
        if (!llmConfig.isConfigured()) {
            throw new IllegalStateException("LLM not configured. Please set LLM_PROVIDER and LLM_API_KEY in .env");
        }

        try {
            LLMChatCompletionDTO response = callLLMAPIWithFallback(prompt);
            if (response != null && response.getChoices() != null && !response.getChoices().isEmpty()) {
                return response.getChoices().get(0).getMessage().getContent();
            }
        } catch (Exception e) {
            logger.error("Error calling LLM API: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate text from LLM: " + e.getMessage(), e);
        }

        throw new RuntimeException("No response from LLM provider");
    }

    /**
     * Call the LLM API (Groq or DeepSeek)
     */
    private LLMChatCompletionDTO callLLMAPIWithFallback(String prompt) throws Exception {
        String configuredModel = llmConfig.getModel();
        try {
            return callLLMAPI(prompt, configuredModel);
        } catch (HttpClientErrorException e) {
            String body = e.getResponseBodyAsString();
            if (isModelNotFound(body)) {
                for (String fallbackModel : getFallbackModels(configuredModel)) {
                    try {
                        logger.warn("LLM model '{}' not available; retrying with '{}'", configuredModel, fallbackModel);
                        return callLLMAPI(prompt, fallbackModel);
                    } catch (HttpClientErrorException fallbackError) {
                        String fallbackBody = fallbackError.getResponseBodyAsString();
                        if (isModelNotFound(fallbackBody)) {
                            continue;
                        }
                        throw fallbackError;
                    }
                }
            }
            throw e;
        }
    }

    private List<String> getFallbackModels(String configuredModel) {
        // Keep this short and conservative; users can always override via LLM_MODEL.
        List<String> candidates = List.of(
            "mixtral-8x7b-32768",
            "llama3-8b-8192",
            "llama3-70b-8192"
        );
        return candidates.stream().filter(m -> !m.equalsIgnoreCase(configuredModel)).toList();
    }

    private boolean isModelNotFound(String responseBody) {
        if (responseBody == null) return false;
        String body = responseBody.toLowerCase();
        return body.contains("model_not_found") || body.contains("does not exist") || body.contains("do not have access");
    }

    private LLMChatCompletionDTO callLLMAPI(String prompt, String model) throws Exception {
        String apiUrl = normalizeBaseUrl(llmConfig.getApiUrl());
        String apiKey = llmConfig.getApiKey();

        // Build request
        List<Message> messages = new ArrayList<>();
        messages.add(new Message("user", prompt));

        LLMChatCompletionRequestDTO request = new LLMChatCompletionRequestDTO(
            model,
            messages,
            llmConfig.getMaxTokens(),
            llmConfig.getTemperature()
        );

        // Set headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<LLMChatCompletionRequestDTO> entity = new HttpEntity<>(request, headers);

        // Make API call
        logger.debug("Calling {} with model: {}", apiUrl, model);
        ResponseEntity<LLMChatCompletionDTO> response = restTemplate.postForEntity(
            apiUrl + "chat/completions",
            entity,
            LLMChatCompletionDTO.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("LLM API returned status: " + response.getStatusCode());
        }

        return response.getBody();
    }

    private String normalizeBaseUrl(String apiUrl) {
        if (apiUrl == null || apiUrl.isBlank()) {
            return "https://api.groq.com/openai/v1/";
        }
        return apiUrl.endsWith("/") ? apiUrl : apiUrl + "/";
    }

    /**
     * Check if LLM is properly configured
     */
    public boolean isConfigured() {
        return llmConfig.isConfigured();
    }
}
