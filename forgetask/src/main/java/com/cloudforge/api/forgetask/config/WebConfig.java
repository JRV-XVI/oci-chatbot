package com.cloudforge.api.forgetask.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * MODIFICADO EN ESTE PROMPT
 * Configuración CORS para comunicación HTTP
 * (WebSocket CORS se configura en WebSocketConfig.java)
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

//    @Override
//    public void addCorsMappings(CorsRegistry registry) {
//        registry
//                .addMapping("/**")
//            .allowedOriginPatterns(
//                "http://localhost:*",
//                "http://127.0.0.1:*",
//                "http://host.docker.internal:*",
//                "http://160.34.209.215",
//                "http://160.34.209.215:*"
//            )
//                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
//                .allowedHeaders("*");
//    }
}