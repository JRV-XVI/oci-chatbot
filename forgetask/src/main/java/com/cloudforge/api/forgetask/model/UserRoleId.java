package com.cloudforge.api.forgetask.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class UserRoleId implements Serializable {
    @Column(name = "ID_USER")
    private Long idUser;

    @Column(name = "ROLE", length = 20)
    private String role;

    public UserRoleId() {}
    public UserRoleId(Long idUser, String role) {
        this.idUser = idUser;
        this.role = role;
    }

    public Long getIdUser()            { return idUser; }
    public void setIdUser(Long id)     { this.idUser = id; }
    public String getRole()            { return role; }
    public void setRole(String role)   { this.role = role; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserRoleId)) return false;
        UserRoleId that = (UserRoleId) o;
        return Objects.equals(idUser, that.idUser) && Objects.equals(role, that.role);
    }
    @Override
    public int hashCode() { return Objects.hash(idUser, role); }
}
