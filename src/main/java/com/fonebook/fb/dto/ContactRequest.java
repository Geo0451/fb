package com.fonebook.fb.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ContactRequest {
    private Long cliqueId;
    private String name;
    private String phoneNumber;
    private String notes;
}