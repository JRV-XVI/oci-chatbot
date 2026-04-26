package com.cloudforge.api.forgetask.model;

import jakarta.persistence.*;
import java.util.Set;

@Entity
@Table(name = "USER_ACCOUNT", schema = "APP_USER")

public class UserAccount {
    @Id
    @Column(name = "ID_USER")
    private Long idUser;

    @Column(name = "ID_PROJECT", nullable = false)
    private Long idProject;

    @Column(name = "USERNAME", nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "PASSWORD", nullable = false, length = 255)
    private String password;

    @Column(name = "EMAIL", nullable = false, unique = true, length = 50)
    private String email;

    @Column(name = "FIRST_NAME", nullable = false, length = 50)
    private String firstName;

    @Column(name = "LAST_NAME", nullable = false, length = 50)
    private String lastName;

    @Column(name = "PHONE_NUMBER", length = 20)
    private String phoneNumber;

    @OneToMany(mappedBy = "userAccount", fetch = FetchType.LAZY)
    private Set<UserRole> roles;

    public Long getIdUser()                      { return idUser; }
    public void setIdUser(Long idUser)           { this.idUser = idUser; }
    public Long getIdProject()                   { return idProject; }
    public void setIdProject(Long idProject)     { this.idProject = idProject; }
    public String getUsername()                  { return username; }
    public void setUsername(String username)     { this.username = username; }
    public String getPassword()                  { return password; }
    public void setPassword(String password)     { this.password = password; }
    public String getEmail()                     { return email; }
    public void setEmail(String email)           { this.email = email; }
    public String getFirstName()                 { return firstName; }
    public void setFirstName(String firstName)   { this.firstName = firstName; }
    public String getLastName()                  { return lastName; }
    public void setLastName(String lastName)     { this.lastName = lastName; }
    public String getPhoneNumber()               { return phoneNumber; }
    public void setPhoneNumber(String phone)     { this.phoneNumber = phone; }
    public Set<UserRole> getRoles()              { return roles; }
    public void setRoles(Set<UserRole> roles)    { this.roles = roles; }
}