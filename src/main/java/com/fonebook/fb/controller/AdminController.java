package com.fonebook.fb.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fonebook.fb.dto.AssignCliqueRequest;
import com.fonebook.fb.dto.CreateManagerRequest;
import com.fonebook.fb.dto.UserResponse;
import com.fonebook.fb.model.Clique;
import com.fonebook.fb.model.User;
import com.fonebook.fb.repository.UserRepository;
import com.fonebook.fb.service.AdminService;
import com.fonebook.fb.dto.CreateCliqueRequest;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;

    @PostMapping("/managers")
    public UserResponse createManager(@RequestBody CreateManagerRequest request) {
        User manager = adminService.createManager(request.getName(), request.getEmail(), request.getPassword());
        return new UserResponse(manager);
    }   

    public void deleteManager(Long managerId) {
    if (!userRepository.existsById(managerId)) {
        throw new IllegalArgumentException("Manager not found");
    }
    userRepository.deleteById(managerId);
}

    @PostMapping("/assign-clique")
    public void assignCliqueToManager(@RequestBody AssignCliqueRequest request) {
        adminService.assignCliqueToManager(request.getManagerId(), request.getCliqueId());
    }

    @PostMapping("/remove-clique")
    public void removeCliqueFromManager(@RequestBody AssignCliqueRequest request) {
        adminService.removeCliqueFromManager(request.getManagerId(), request.getCliqueId());
    }

    @PostMapping("/cliques")
    public Clique createClique(@RequestBody CreateCliqueRequest request) {
        return adminService.createClique(request.getName(), request.getDescription());
    }
}