package com.fonebook.fb.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateManagerRequest {
    private String name;
    private String email;
    private String password;
}