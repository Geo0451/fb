package com.fonebook.fb;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

// TEMPORARY — delete this class once you've copied the hash into your SQL insert
@Component
@RequiredArgsConstructor
public class Tester implements CommandLineRunner {

    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        System.out.println("HASH: " + passwordEncoder.encode("password123"));
    }
}