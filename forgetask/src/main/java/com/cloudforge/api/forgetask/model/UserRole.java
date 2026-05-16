package com.cloudforge.api.forgetask.model;

import jakarta.persistence.*;

@Entity
@Table(name = "USER_ROLE", schema = "APP_USER")
public class UserRole {

    @EmbeddedId
    private UserRoleId id;

    public UserRoleId getId()        { return id; }
    public void setId(UserRoleId id) { this.id = id; }
    public String getRole()          { return id != null ? id.getRole() : null; }
}