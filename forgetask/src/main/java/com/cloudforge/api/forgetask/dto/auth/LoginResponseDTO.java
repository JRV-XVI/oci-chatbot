package com.cloudforge.api.forgetask.dto.auth;

import java.util.List;

/**
 * Respuesta del endpoint POST /api/auth/login.
 * El frontend almacena el token y los datos del usuario en memoria.
 */
public class LoginResponseDTO {
    private String token;
    private String tokenType = "Bearer";
    private Long   idUser;
    private Long   idProject;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private List<String> roles;

    // Constructor completo
    public LoginResponseDTO(String token, Long idUser, Long idProject, String username,
                            String email, String firstName, String lastName,
                            List<String> roles) {
        this.token     = token;
        this.idUser    = idUser;
        this.idProject = idProject;
        this.username  = username;
        this.email     = email;
        this.firstName = firstName;
        this.lastName  = lastName;
        this.roles     = roles;
    }

    public String getToken()            { return token; }
    public String getTokenType()        { return tokenType; }
    public Long   getIdUser()           { return idUser; }
    public String getUsername()         { return username; }
    public String getEmail()            { return email; }
    public String getFirstName()        { return firstName; }
    public String getLastName()         { return lastName; }
    public List<String> getRoles()      { return roles; }
}
