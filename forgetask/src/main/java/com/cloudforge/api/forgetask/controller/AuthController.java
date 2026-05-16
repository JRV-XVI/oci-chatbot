package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.auth.LoginRequestDTO;
import com.cloudforge.api.forgetask.dto.auth.LoginResponseDTO;
import com.cloudforge.api.forgetask.dto.auth.SignupRequestDTO;
import com.cloudforge.api.forgetask.service.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoint de autenticación.
 *
 * POST /api/auth/login  →  { email, password }  →  { token, user data }
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Login del usuario con email y contraseña.
     * Retorna un JWT + datos básicos del usuario.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO request) {
        try {
            LoginResponseDTO response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Registro de un nuevo usuario MANAGER.
     * Retorna un JWT + datos básicos del usuario.
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequestDTO request) {
        try {
            LoginResponseDTO response = authService.signup(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
