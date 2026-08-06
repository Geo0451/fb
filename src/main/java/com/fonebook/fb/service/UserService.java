package com.fonebook.fb.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.fonebook.fb.model.User;
import com.fonebook.fb.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getUsersByName(String name) {
        return  userRepository.findByNameContainingIgnoreCase(name);
    }
    
}
