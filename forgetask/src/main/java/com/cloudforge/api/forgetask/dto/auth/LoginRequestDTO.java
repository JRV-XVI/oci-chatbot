package com.cloudforge.api.forgetask.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Body que recibe el endpoint POST /api/auth/login.
 * Refleja exactamente lo que envía el frontend (email + password).
 */
public class LoginRequestDTO {
    @NotBlank(message = "El correo no puede estar vacío")
    @Email(message = "Formato de correo inválido")
    private String email;

    @NotBlank(message = "La contraseña no puede estar vacía")
    private String password;

    public String getEmail()               { return email; }
    public void setEmail(String email)     { this.email = email; }
    public String getPassword()            { return password; }
    public void setPassword(String pwd)    { this.password = pwd; }
}
