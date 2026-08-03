package com.fonebook.model;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Clique {

    @Id
    @GeneratedValue
    private Long id;

    private String name;
    private String description;

    @ManyToMany(mappedBy = "managedCliques")
    private Set<User> managers = new HashSet<>();
}