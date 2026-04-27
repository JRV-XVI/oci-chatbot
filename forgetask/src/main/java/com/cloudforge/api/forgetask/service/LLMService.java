package com.cloudforge.api.forgetask.service;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.cloudforge.api.forgetask.config.LLMConfig;
import com.cloudforge.api.forgetask.dto.LLMChatCompletionDTO;
import com.cloudforge.api.forgetask.dto.LLMChatCompletionRequestDTO;
import com.cloudforge.api.forgetask.dto.LLMChatCompletionRequestDTO.Message;

/**
 * Service to interact with LLM providers (Groq, DeepSeek)
 * Handles API calls and response parsing
 *
 * FIX: Updated fallback model list to current Groq model names (2025).
 *      mixtral-8x7b-32768 and llama3-* were deprecated/renamed by Groq.
 * FIX: Added detailed error logging so failures are visible in Spring logs.
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
     * Generate text content using configured LLM provider.
     *
     * @param prompt The prompt to send to the LLM
     * @return Generated text response
     */
    public String generateText(String prompt) throws Exception {
        if (!llmConfig.isConfigured()) {
            throw new IllegalStateException(
                "LLM not configured. Please set LLM_PROVIDER and LLM_API_KEY in .env"
            );
        }

        try {
            LLMChatCompletionDTO response = callLLMAPIWithFallback(prompt);
            if (response != null
                    && response.getChoices() != null
                    && !response.getChoices().isEmpty()) {
                return response.getChoices().get(0).getMessage().getContent();
            }
        } catch (Exception e) {
            // Log the full stack trace so the real cause is visible in the console.
            logger.error("Error calling LLM API: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate text from LLM: " + e.getMessage(), e);
        }

        throw new RuntimeException("No response from LLM provider");
    }

    /**
     * Try the configured model first; on model-not-found errors, iterate through
     * the fallback list.
     */
    private LLMChatCompletionDTO callLLMAPIWithFallback(String prompt) throws Exception {
        String configuredModel = llmConfig.getModel();

        // Log which model we are about to try so it is easy to spot in logs.
        logger.info("Attempting LLM call with model: '{}'", configuredModel);

        try {
            return callLLMAPI(prompt, configuredModel);
        } catch (HttpClientErrorException e) {
            // FIX: Log full HTTP error body so we can see the exact Groq error message.
            logger.error(
                "Groq HTTP {} error for model '{}' — response body: {}",
                e.getStatusCode(), configuredModel, e.getResponseBodyAsString()
            );

            String body = e.getResponseBodyAsString();
            if (isModelNotFound(body)) {
                for (String fallbackModel : getFallbackModels(configuredModel)) {
                    try {
                        logger.warn(
                            "Model '{}' not available; retrying with fallback '{}'",
                            configuredModel, fallbackModel
                        );
                        return callLLMAPI(prompt, fallbackModel);
                    } catch (HttpClientErrorException fallbackError) {
                        logger.error(
                            "Groq HTTP {} error for fallback model '{}' — response body: {}",
                            fallbackError.getStatusCode(),
                            fallbackModel,
                            fallbackError.getResponseBodyAsString()
                        );
                        String fallbackBody = fallbackError.getResponseBodyAsString();
                        if (isModelNotFound(fallbackBody)) {
                            // Try the next model in the list.
                            continue;
                        }
                        // Some other error (auth, rate-limit, etc.) — stop and rethrow.
                        throw fallbackError;
                    }
                }
                // All fallbacks exhausted.
                throw new RuntimeException(
                    "No available Groq model found. Tried: " + configuredModel
                    + " and all fallbacks. Check console.groq.com for available models."
                );
            }
            throw e;
        }
    }

    /**
     * FIX: Updated list to current Groq model IDs as of 2025.
     *
     * Removed deprecated:
     *   - mixtral-8x7b-32768   (retired by Groq)
     *   - llama3-8b-8192       (renamed)
     *   - llama3-70b-8192      (renamed)
     *
     * Current stable Groq models (free tier):
     *   - llama-3.1-8b-instant   (fast, free)
     *   - llama-3.3-70b-versatile (better quality, free)
     *   - gemma2-9b-it           (Google Gemma, free on Groq)
     */
    private List<String> getFallbackModels(String configuredModel) {
        List<String> candidates = List.of(
            "llama-3.1-8b-instant",
            "llama-3.3-70b-versatile",
            "gemma2-9b-it"
        );
        return candidates.stream()
            .filter(m -> !m.equalsIgnoreCase(configuredModel))
            .toList();
    }

    private boolean isModelNotFound(String responseBody) {
        if (responseBody == null) return false;
        String body = responseBody.toLowerCase();
        return body.contains("model_not_found")
            || body.contains("does not exist")
            || body.contains("do not have access")
            || body.contains("decommissioned")
            || body.contains("deprecated");
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

        // FIX: Changed debug → info so the URL and model are always visible in logs.
        logger.info("Calling Groq endpoint: {}chat/completions  model={}", apiUrl, model);

        ResponseEntity<LLMChatCompletionDTO> response = restTemplate.postForEntity(
            apiUrl + "chat/completions",
            entity,
            LLMChatCompletionDTO.class
        );

        logger.info("Groq response status: {}", response.getStatusCode());

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
     * Check if LLM is properly configured (provider + non-blank API key).
     */
    public boolean isConfigured() {
        return llmConfig.isConfigured();
    }
}