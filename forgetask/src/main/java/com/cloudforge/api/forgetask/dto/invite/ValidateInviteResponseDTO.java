package com.cloudforge.api.forgetask.dto.invite;

public class ValidateInviteResponseDTO {
    private String email;
    private String role;
    private Long idProject;
    private boolean valid;

    public ValidateInviteResponseDTO(String email, String role, Long idProject, boolean valid) {
        this.email = email;
        this.role = role;
        this.idProject = idProject;
        this.valid = valid;
    }

    public String getEmail()        { return email; }
    public String getRole()         { return role; }
    public Long getIdProject()      { return idProject; }
    public boolean isValid()        { return valid; }
}
