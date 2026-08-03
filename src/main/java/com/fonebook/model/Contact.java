package com.fonebook.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Contact {
    @Id
    @GeneratedValue
    private Long id;
    private String name;

    private String phoneNumber;
    private String notes;

    
    @ManyToOne
    @JoinColumn(name = "clique_id")
    private Clique clique;

    @ManyToOne
    @JoinColumn(name = "added_by_user_id")
    private User addedBy;

    @CreationTimestamp
    private LocalDateTime timestamp;
}