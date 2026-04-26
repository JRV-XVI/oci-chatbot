package com.cloudforge.api.forgetask.repository;

import com.cloudforge.api.forgetask.model.UserRole;
import com.cloudforge.api.forgetask.model.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {}