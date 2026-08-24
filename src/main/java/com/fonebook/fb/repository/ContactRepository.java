package com.fonebook.fb.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fonebook.fb.model.Contact;

public interface ContactRepository extends JpaRepository<Contact, Long> {
    List<Contact> findByClique_Id(Long cliqueId);
    List<Contact> findByAddedById(Long addedById);

    @Modifying
    @Query("update Contact c set c.clique = null where c.clique.id = :cliqueId")
    int unlinkFromClique(@Param("cliqueId") Long cliqueId);
}