package com.fonebook.fb.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fonebook.fb.model.Clique;
import com.fonebook.fb.model.User;
import com.fonebook.fb.service.UserService;

import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/managers")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // GET /api/managers?name=Test Admin
    @GetMapping
    public List<User> searchUsers(@RequestParam(required = false) String name) {
        if (name != null) {
            return userService.getUsersByName(name.trim());
        }
        return userService.getAllUsers();
    }
    @GetMapping("/{managerId}/cliques")
    public List<Clique> getManagerCliques(@PathVariable Long managerId) {
        User manager = userService.findById(managerId)
            .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
        return new ArrayList<>(manager.getManagedCliques());  // convert Set to List
}

    

}
