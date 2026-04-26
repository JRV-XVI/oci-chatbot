package com.cloudforge.api.forgetask.repository;

import com.cloudforge.api.forgetask.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {}