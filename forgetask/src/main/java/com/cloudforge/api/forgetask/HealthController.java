package com.cloudforge.api.forgetask;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @Value("${POD_NAMESPACE:unknown-namespace}")
    private String namespace;

    @Value("${APP_VERSION:unknown-version}")
    private String version;

    @GetMapping({"/health", "/"})
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "service", "forgetask",
                "namespace", namespace,
                "version", version
        );
    }
}
