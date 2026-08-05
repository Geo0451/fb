package com.fonebook.fb.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fonebook.fb.model.User;
import com.fonebook.fb.service.UserService;

import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/managers")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/search")
    public List<User> getUsersByName(@RequestParam String name) {
        name = name.trim();
        return userService.getUsersByName(name);
    }

}
