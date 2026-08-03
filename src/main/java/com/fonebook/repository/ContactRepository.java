package com.fonebook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fonebook.model.Contact;

public interface ContactRepository extends JpaRepository<Contact, Long> {
    List<Contact> findByClique_Id(Long cliqueId);
}