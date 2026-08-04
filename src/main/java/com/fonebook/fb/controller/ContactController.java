package com.fonebook.fb.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fonebook.fb.dto.ContactRequest;
import com.fonebook.fb.model.Contact;
import com.fonebook.fb.service.ContactService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @GetMapping("/clique/{cliqueId}")
    public List<Contact> getContactsForClique(@PathVariable Long cliqueId) {
        return contactService.getContactsForClique(cliqueId);
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public Contact addContact(@RequestBody ContactRequest request, Authentication authentication) {
        Long managerId = Long.parseLong(authentication.getName());

        Contact newContact = new Contact();
        newContact.setName(request.getName());
        newContact.setPhoneNumber(request.getPhoneNumber());
        newContact.setNotes(request.getNotes());

        return contactService.addContact(managerId, request.getCliqueId(), newContact);
    }

    @PutMapping("/{contactId}")
    @PreAuthorize("hasRole('MANAGER')")
    public Contact updateContact(@PathVariable Long contactId, @RequestBody ContactRequest request, Authentication authentication) {
        Long managerId = Long.parseLong(authentication.getName());

        Contact updatedData = new Contact();
        updatedData.setName(request.getName());
        updatedData.setPhoneNumber(request.getPhoneNumber());
        updatedData.setNotes(request.getNotes());

        return contactService.updateContact(managerId, contactId, updatedData);
    }

    @DeleteMapping("/{contactId}")
    @PreAuthorize("hasRole('MANAGER')")
    public void deleteContact(@PathVariable Long contactId, Authentication authentication) {
        Long managerId = Long.parseLong(authentication.getName());
        contactService.deleteContact(managerId, contactId);
    }
}