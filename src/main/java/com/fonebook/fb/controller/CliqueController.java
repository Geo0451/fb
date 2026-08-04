package com.fonebook.fb.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fonebook.fb.model.Clique;
import com.fonebook.fb.service.CliqueService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/cliques")
@RequiredArgsConstructor
public class CliqueController {

    private final CliqueService cliqueService;

    @GetMapping
    public List<Clique> getAllCliques() {
        return cliqueService.getAllCliques();
    }
}