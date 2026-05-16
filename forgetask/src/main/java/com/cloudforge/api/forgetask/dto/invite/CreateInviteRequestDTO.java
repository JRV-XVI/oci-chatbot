package com.cloudforge.api.forgetask.dto.invite;

public class CreateInviteRequestDTO {
    private String email;
    private String role;
    private Long idProject;

    public String getEmail()            { return email; }
    public void setEmail(String email)  { this.email = email; }
    public String getRole()             { return role; }
    public void setRole(String role)    { this.role = role; }
    public Long getIdProject()          { return idProject; }
    public void setIdProject(Long id)   { this.idProject = id; }
}
