package com.fonebook.fb.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.fonebook.fb.model.Clique;
import com.fonebook.fb.model.User;
import com.fonebook.fb.repository.CliqueRepository;
import com.fonebook.fb.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final CliqueRepository cliqueRepository;
    private final PasswordEncoder passwordEncoder;

    public User createManager(String name, String email, String rawPassword) {
        User manager = new User();
        manager.setName(name);
        manager.setEmail(email);
        manager.setPasswordHash(passwordEncoder.encode(rawPassword));
        manager.setRole("MANAGER");
        return userRepository.save(manager);
    }

    public void deleteManager(Long managerId) {
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
}