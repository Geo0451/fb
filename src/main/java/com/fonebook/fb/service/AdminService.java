package com.fonebook.fb.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.fonebook.fb.model.Clique;
import com.fonebook.fb.model.Contact;
import com.fonebook.fb.model.User;
import com.fonebook.fb.repository.CliqueRepository;
import com.fonebook.fb.repository.ContactRepository;
import com.fonebook.fb.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final CliqueRepository cliqueRepository;
    private final PasswordEncoder passwordEncoder;
    private final ContactRepository contactRepository;

    public User createManager(String name, String email, String rawPassword) {
        User manager = new User();
        manager.setName(name);
        manager.setEmail(email);
        manager.setPasswordHash(passwordEncoder.encode(rawPassword));
        manager.setRole("MANAGER");
        return userRepository.save(manager);
    }

    @Transactional
     public void deleteManager(Long managerId) {
        if (!userRepository.existsById(managerId)) {
            throw new IllegalArgumentException("Manager not found with id: " + managerId);
        }

        // detach any contacts this manager authored so the FK doesn't block the delete
        List<Contact> authored = contactRepository.findByAddedById(managerId);
        authored.forEach(c -> c.setAddedBy(null));
        contactRepository.saveAll(authored);

        userRepository.deleteById(managerId);
    }

    public void assignCliqueToManager(Long managerId, Long cliqueId) {
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
        Clique clique = cliqueRepository.findById(cliqueId)
                .orElseThrow(() -> new IllegalArgumentException("Clique not found"));

        manager.getManagedCliques().add(clique);
        userRepository.save(manager);
    }

    public void removeCliqueFromManager(Long managerId, Long cliqueId) {
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
        manager.getManagedCliques().removeIf(c -> c.getId().equals(cliqueId));
        userRepository.save(manager);
    }

    public Clique createClique(String name, String description) {
        Clique clique = new Clique();
        clique.setName(name);
        clique.setDescription(description);
        return cliqueRepository.save(clique);
    }
}