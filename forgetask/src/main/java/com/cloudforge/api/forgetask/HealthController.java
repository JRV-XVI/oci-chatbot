package com.cloudforge.api.forgetask;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private static final String DEFAULT_NAMESPACE = "no-consultado";
    private static final String DEFAULT_VERSION = "unknown-version";

    @Value("${POD_NAMESPACE:}")
    private String namespace;

    @Value("${APP_VERSION:}")
    private String version;

    @GetMapping({"/health", "/", "/api/health"})
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "service", "forgetask",
                "namespace", defaultIfBlank(namespace, DEFAULT_NAMESPACE),
                "version", defaultIfBlank(version, DEFAULT_VERSION)
        );
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? defaultValue : normalized;
    }
}
