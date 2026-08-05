package com.fonebook.fb.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fonebook.fb.model.Clique;

public interface CliqueRepository extends JpaRepository<Clique, Long> {

    public List<Clique> findByName(String name);
}