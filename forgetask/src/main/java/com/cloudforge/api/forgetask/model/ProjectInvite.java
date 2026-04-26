package com.cloudforge.api.forgetask.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PROJECT_INVITE", schema = "APP_USER")
public class ProjectInvite {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "invite_seq")
    @SequenceGenerator(name = "invite_seq", sequenceName = "APP_USER.SEQ_PROJECT_INVITE", allocationSize = 1)
    @Column(name = "ID_INVITE")
    private Long idInvite;

    @Column(name = "ID_PROJECT", nullable = false)
    private Long idProject;

    @Column(name = "EMAIL", nullable = false, length = 100)
    private String email;

    @Column(name = "ROLE", nullable = false, length = 20)
    private String role;

    @Column(name = "INVITE_TOKEN", nullable = false, unique = true, length = 255)
    private String inviteToken;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @Column(name = "EXPIRES_AT")
    private LocalDateTime expiresAt;

    @Column(name = "STATUS", length = 20)
    private String status = "PENDING";

    public Long getIdInvite()                       { return idInvite; }
    public void setIdInvite(Long id)                { this.idInvite = id; }
    
    public Long getIdProject()                      { return idProject; }
    public void setIdProject(Long idProject)        { this.idProject = idProject; }
    
    public String getEmail()                        { return email; }
    public void setEmail(String email)              { this.email = email; }
    
    public String getRole()                         { return role; }
    public void setRole(String role)                { this.role = role; }
    
    public String getInviteToken()                  { return inviteToken; }
    public void setInviteToken(String token)        { this.inviteToken = token; }
    
    public LocalDateTime getCreatedAt()             { return createdAt; }
    public void setCreatedAt(LocalDateTime d)       { this.createdAt = d; }
    
    public LocalDateTime getExpiresAt()             { return expiresAt; }
    public void setExpiresAt(LocalDateTime d)       { this.expiresAt = d; }
    
    public String getStatus()                       { return status; }
    public void setStatus(String status)            { this.status = status; }
}
