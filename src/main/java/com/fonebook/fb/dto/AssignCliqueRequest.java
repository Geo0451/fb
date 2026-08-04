package com.fonebook.fb.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AssignCliqueRequest {
    private Long managerId;
    private Long cliqueId;
}