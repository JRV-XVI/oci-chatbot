package com.cloudforge.api.forgetask.repository;

import com.cloudforge.api.forgetask.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    /** Login by email (campo usado desde el frontend) */
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByUsername(String username);

    /** Útil para signup: validar si el username ya existe */
    boolean existsByUsername(String username);

    /** Útil para signup: validar si el email ya existe */
    boolean existsByEmail(String email);
}
