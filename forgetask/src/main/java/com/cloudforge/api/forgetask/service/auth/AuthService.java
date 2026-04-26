package com.cloudforge.api.forgetask.service.auth;

import com.cloudforge.api.forgetask.dto.auth.LoginRequestDTO;
import com.cloudforge.api.forgetask.dto.auth.LoginResponseDTO;
import com.cloudforge.api.forgetask.model.UserAccount;
import com.cloudforge.api.forgetask.repository.UserAccountRepository;
import com.cloudforge.api.forgetask.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Lógica de autenticación.
 * Flujo: busca usuario por email → verifica BCrypt → genera JWT → retorna DTO.
 */
@Service
public class AuthService {
    private final UserAccountRepository userRepo;
    private final PasswordEncoder       passwordEncoder;
    private final JwtUtil               jwtUtil;

    public AuthService(UserAccountRepository userRepo,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil         = jwtUtil;
    }

    /**
     * Autentica al usuario y retorna el JWT junto con sus datos básicos.
     *
     * @throws ResponseStatusException 401 si las credenciales son incorrectas
     */
    public LoginResponseDTO login(LoginRequestDTO request) {

        // 1. Buscar usuario por email
        UserAccount user = userRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Credenciales incorrectas"));

        // 2. Verificar contraseña contra el hash BCrypt almacenado en la DB
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Credenciales incorrectas");
        }

        // 3. Obtener roles del usuario
        List<String> roles = user.getRoles() != null
                ? user.getRoles().stream()
                      .map(r -> r.getId().getRole())
                      .collect(Collectors.toList())
                : List.of();

        // 4. Generar JWT firmado (subject = email)
        String token = jwtUtil.generateToken(user.getEmail());

        // 5. Construir respuesta
        return new LoginResponseDTO(
                token,
                user.getIdUser(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                roles
        );
    }
}
