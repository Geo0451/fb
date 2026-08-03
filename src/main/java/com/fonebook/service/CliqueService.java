package com.fonebook.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.fonebook.model.Clique;
import com.fonebook.repository.CliqueRepository;

import lombok.RequiredArgsConstructor;
@Service
@RequiredArgsConstructor
public class CliqueService {
    private final CliqueRepository cliqueRepository;

    public List<Clique> getAllCliques() {
        return cliqueRepository.findAll();
    }
}