package com.cloudforge.api.forgetask.model;

import jakarta.persistence.*;

@Entity
@Table(name = "USER_ROLE", schema = "APP_USER")
public class UserRole {
    @EmbeddedId
    private UserRoleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("idUser")
    @JoinColumn(name = "ID_USER")
    private UserAccount userAccount;

    public UserRoleId getId()                          { return id; }
    public void setId(UserRoleId id)                   { this.id = id; }
    public UserAccount getUserAccount()                { return userAccount; }
    public void setUserAccount(UserAccount account)    { this.userAccount = account; }
    public String getRole()                            { return id != null ? id.getRole() : null; }
}
