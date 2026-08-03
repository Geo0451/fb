package com.fonebook.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fonebook.model.Clique;

public interface CliqueRepository extends JpaRepository<Clique, Long> {
}