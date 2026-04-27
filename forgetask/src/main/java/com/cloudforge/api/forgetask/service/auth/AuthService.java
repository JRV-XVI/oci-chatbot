package com.cloudforge.api.forgetask.service.auth;

import com.cloudforge.api.forgetask.dto.auth.LoginRequestDTO;
import com.cloudforge.api.forgetask.dto.auth.LoginResponseDTO;
import com.cloudforge.api.forgetask.dto.auth.SignupRequestDTO;
import com.cloudforge.api.forgetask.model.Project;
import com.cloudforge.api.forgetask.model.ProjectInvite;
import com.cloudforge.api.forgetask.model.UserRole;
import com.cloudforge.api.forgetask.model.UserRoleId;
import com.cloudforge.api.forgetask.repository.ProjectRepository;
import com.cloudforge.api.forgetask.repository.UserRoleRepository;
import com.cloudforge.api.forgetask.service.invite.InviteService;
import org.springframework.transaction.annotation.Transactional;
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
    private final ProjectRepository projectRepository;
    private final UserRoleRepository userRoleRepository;
    private final InviteService inviteService;
    private final PasswordEncoder       passwordEncoder;
    private final JwtUtil               jwtUtil;

    public AuthService(UserAccountRepository userRepo,
                       ProjectRepository projectRepository,
                       UserRoleRepository userRoleRepository,
                       InviteService inviteService,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepo        = userRepo;
        this.projectRepository = projectRepository;
        this.userRoleRepository = userRoleRepository;
        this.inviteService = inviteService;
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
                user.getIdProject(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                roles
        );
    }

        /**
         * Registra un nuevo usuario con rol "USER" y lo asigna a un proyecto por defecto.
         *
         * @throws ResponseStatusException 400 si el email o username ya existen
         */
    @Transactional
    public LoginResponseDTO signup(SignupRequestDTO request) {

        // 1. Validar que el email y username no existan
        if (userRepo.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El correo ya está registrado.");
        }
        if (userRepo.existsByUsername(request.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso.");
        }

        // 2. Preparar UserAccount
        UserAccount user = new UserAccount();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        UserAccount savedUser;
        UserRole role = new UserRole();
        UserRoleId roleId = new UserRoleId();

        if (request.getInviteToken() != null && !request.getInviteToken().isBlank()) {
            // Flujo Developer: consume el token y asigna proyecto/rol del invite
            ProjectInvite invite = inviteService.consumeInvite(request.getInviteToken());

            if (!invite.getEmail().equalsIgnoreCase(request.getEmail())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El correo no coincide con la invitación.");
            }

            user.setIdProject(invite.getIdProject());
            savedUser = userRepo.save(user);

            roleId.setIdUser(savedUser.getIdUser());
            roleId.setRole(invite.getRole());
            role.setId(roleId);
            userRoleRepository.save(role);
        } else {
            // Flujo Manager: crear proyecto temporal y asignar rol manager
            Project project = new Project();
            project.setTitle("Proyecto temporal");
            Project savedProject = projectRepository.save(project);

            user.setIdProject(savedProject.getIdProject());
            savedUser = userRepo.save(user);

            roleId.setIdUser(savedUser.getIdUser());
            roleId.setRole("manager");
            role.setId(roleId);
            userRoleRepository.save(role);
        }

        // 5. Auto-login: devolver JWT igual que en /login
        return login(new LoginRequestDTO(request.getEmail(), request.getPassword()));
    }
}
