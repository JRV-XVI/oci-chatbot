package com.cloudforge.api.forgetask.service.invite;

import com.cloudforge.api.forgetask.dto.invite.CreateInviteRequestDTO;
import com.cloudforge.api.forgetask.dto.invite.ValidateInviteResponseDTO;
import com.cloudforge.api.forgetask.model.ProjectInvite;
import com.cloudforge.api.forgetask.repository.ProjectInviteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class InviteService {
    private final ProjectInviteRepository inviteRepo;

    public InviteService(ProjectInviteRepository inviteRepo) {
        this.inviteRepo = inviteRepo;
    }

    /**
     * El Manager crea una invitación. Devuelve el token generado
     * para que el frontend construya el link de invitación.
     */
    public String createInvite(CreateInviteRequestDTO request) {
        // Validar que no exista ya una invitación PENDING para ese email en ese proyecto
        if (inviteRepo.existsByEmailAndIdProjectAndStatus(
                request.getEmail(), request.getIdProject(), "PENDING")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    " una invitación pendiente para ese correo en este proyecto.");
        }

        String token = UUID.randomUUID().toString();

        ProjectInvite invite = new ProjectInvite();
        invite.setIdProject(request.getIdProject());
        invite.setEmail(request.getEmail());
        invite.setRole(request.getRole());
        invite.setInviteToken(token);
        invite.setCreatedAt(LocalDateTime.now());
        invite.setExpiresAt(LocalDateTime.now().plusHours(48)); // expira en 48h
        invite.setStatus("PENDING");

        inviteRepo.save(invite);
        return token;
    }

    /**
     * Valida un token de invitación antes del signup.
     * El frontend usa esto para pre-llenar el email en el formulario.
     */
    public ValidateInviteResponseDTO validateToken(String token) {
        ProjectInvite invite = inviteRepo.findByInviteToken(token)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Invitación no encontrada o inválida."));

        if (!"PENDING".equals(invite.getStatus())) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Esta invitación ya fue usada o expiró.");
        }

        if (LocalDateTime.now().isAfter(invite.getExpiresAt())) {
            invite.setStatus("EXPIRED");
            inviteRepo.save(invite);
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Esta invitación ha expirado.");
        }

        return new ValidateInviteResponseDTO(
                invite.getEmail(),
                invite.getRole(),
                invite.getIdProject(),
                true
        );
    }

    /**
     * Consumir la invitación luego del signup exitoso.
     * Llamado desde AuthService.signup() cuando llega un inviteToken.
     */
    public ProjectInvite consumeInvite(String token) {
        ProjectInvite invite = inviteRepo.findByInviteToken(token)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Token de invitación inválido."));

        if (!"PENDING".equals(invite.getStatus())) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Esta invitación ya fue usada o expiró.");
        }

        invite.setStatus("ACCEPTED");
        inviteRepo.save(invite);
        return invite;
    }
}
