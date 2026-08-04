package com.fonebook.fb.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.fonebook.fb.model.Clique;
import com.fonebook.fb.repository.CliqueRepository;

import lombok.RequiredArgsConstructor;
@Service
@RequiredArgsConstructor
public class CliqueService {
    private final CliqueRepository cliqueRepository;

    public List<Clique> getAllCliques() {
        return cliqueRepository.findAll();
    }
}