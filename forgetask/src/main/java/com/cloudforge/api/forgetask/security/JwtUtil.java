package com.cloudforge.api.forgetask.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Genera y valida JWT firmados con HMAC-SHA256.
 * Configura la clave y expiración desde application.properties.
 */
@Component
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms:86400000}")   // 24 h por defecto
    private long expirationMs;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    /** Genera un JWT con el email del usuario como subject. */
    public String generateToken(String email) {
        return generateToken(email, null);
    }

    /** Genera un JWT con claims adicionales, incluyendo idProject cuando está disponible. */
    public String generateToken(String email, Integer idProject) {
        Map<String, Object> claims = new HashMap<>();
        if (idProject != null) {
            claims.put("idProject", idProject);
        }

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** Extrae idProject del token cuando existe como claim. */
    public Integer getIdProjectFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        Object raw = claims.get("idProject");
        if (raw instanceof Integer) {
            return (Integer) raw;
        }
        if (raw instanceof Number) {
            return ((Number) raw).intValue();
        }
        return null;
    }

    /** Extrae el email (subject) del token. */
    public String getEmailFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    /** Retorna true si el token es válido (firma + expiración). */
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
