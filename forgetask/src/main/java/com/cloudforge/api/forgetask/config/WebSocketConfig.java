package com.cloudforge.api.forgetask.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * CREADO EN ESTE PROMPT
 * WebSocket Configuración para comunicación bidireccional en tiempo real
 * 
 * Permite que el frontend y backend se comuniquen en tiempo real usando WebSocket
 * y STOMP (Simple Text Oriented Messaging Protocol) para orquestar los mensajes.
 * 
 * Flujo:
 * 1. Cliente conecta a /ws/tasks
 * 2. Cliente envía mensajes a /app/task/update, /app/task/create, /app/task/delete
 * 3. Backend procesa el mensaje y emite eventos a /topic/tasks
 * 4. Todos los clientes suscritos a /topic/tasks reciben el evento automáticamente
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Configura el broker de mensajes que maneja pub/sub
     * 
     * @param config Configuración del broker
     * 
     * enableSimpleBroker("/topic"): 
     *   - Crea un broker en memoria que gestiona tópicos
     *   - /topic/tasks => tópico donde se publican eventos para que TODOS los clientes los reciban
     * 
     * setApplicationDestinationPrefixes("/app"):
     *   - Define el prefijo para rutas donde el cliente ENVÍA mensajes al servidor
     *   - Cliente envía a /app/task/update => se mapea a @MessageMapping("/task/update")
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilitar broker simple que maneja /topic/* para broadcast
        config.enableSimpleBroker("/topic");
        
        // Prefijo para rutas donde el cliente envía mensajes
        config.setApplicationDestinationPrefixes("/app");
    }

    /**
     * Registra el endpoint WebSocket donde los clientes se conectan
     * 
     * @param registry Registro de endpoints STOMP
     * 
     * /ws/tasks: endpoint donde el cliente se conecta (http://localhost:8080/ws/tasks)
     * allowedOrigins: CORS - permite conexiones desde el frontend
     * withSockJS(): Fallback para navegadores/redes que no soportan WebSocket puro
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
            .addEndpoint("/ws/tasks")
            // Permitir conexiones desde frontend local y browser remoto en Docker
            .setAllowedOriginPatterns(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://host.docker.internal:*",
                "http://160.34.209.215",
                "http://160.34.209.215:*"
            )
            // SockJS es un fallback que proporciona WebSocket emulado si el navegador no lo soporta
            .withSockJS();
    }
}
