package com.cloudforge.api.forgetask.repository;

import com.cloudforge.api.forgetask.model.ProjectInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProjectInviteRepository extends JpaRepository<ProjectInvite, Long> {
    Optional<ProjectInvite> findByInviteToken(String token);
    boolean existsByEmailAndIdProjectAndStatus(String email, Long idProject, String status);
}