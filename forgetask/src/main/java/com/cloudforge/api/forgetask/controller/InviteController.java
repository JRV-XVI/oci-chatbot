package com.cloudforge.api.forgetask.controller;

import com.cloudforge.api.forgetask.dto.invite.CreateInviteRequestDTO;
import com.cloudforge.api.forgetask.dto.invite.ValidateInviteResponseDTO;
import com.cloudforge.api.forgetask.service.invite.InviteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/invites")
public class InviteController {
    private final InviteService inviteService;

    public InviteController(InviteService inviteService) {
        this.inviteService = inviteService;
    }

    // ── Manager crea la invitación ──────────────────────────────────────────
    // Protegido con JWT (solo managers autenticados)
    @PostMapping
    public ResponseEntity<?> createInvite(@RequestBody CreateInviteRequestDTO request) {
        String token = inviteService.createInvite(request);
        return ResponseEntity.ok(Map.of(
                "inviteToken", token,
                "inviteLink", "/signup?invite=" + token
        ));
    }

    // ── Developer valida el token (ruta PÚBLICA — sin JWT) ──────────────────
    // El frontend la llama al cargar /signup?invite=TOKEN
    @GetMapping("/validate/{token}")
    public ResponseEntity<ValidateInviteResponseDTO> validateInvite(
            @PathVariable String token) {
        return ResponseEntity.ok(inviteService.validateToken(token));
    }
}
