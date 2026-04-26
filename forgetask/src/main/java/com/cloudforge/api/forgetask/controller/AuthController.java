package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.auth.LoginRequestDTO;
import com.cloudforge.api.forgetask.dto.auth.LoginResponseDTO;
import com.cloudforge.api.forgetask.service.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<LoginResponseDTO> login(
            @Valid @RequestBody LoginRequestDTO request) {

        LoginResponseDTO response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
