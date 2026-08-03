package com.fonebook.service;

import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.fonebook.model.Clique;
import com.fonebook.model.Contact;
import com.fonebook.model.User;
import com.fonebook.repository.CliqueRepository;
import com.fonebook.repository.ContactRepository;
import com.fonebook.repository.UserRepository;

import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final CliqueRepository cliqueRepository;

    public List<Contact> getContactsForClique(Long cliqueId) {
        return contactRepository.findByClique_Id(cliqueId);


        
    }

     public Contact addContact(Long managerId, Long cliqueId, Contact newContact) {
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));
        Clique clique = cliqueRepository.findById(cliqueId)
                .orElseThrow(() -> new IllegalArgumentException("Clique not found"));

        checkManagerAccess(manager, clique);

        newContact.setClique(clique);
        newContact.setAddedBy(manager);
        return contactRepository.save(newContact);
    }

    public Contact updateContact(Long managerId, Long contactId, Contact updatedData) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));

        checkManagerAccess(manager, contact.getClique());

        contact.setName(updatedData.getName());
        contact.setPhoneNumber(updatedData.getPhoneNumber());
        contact.setNotes(updatedData.getNotes());
        return contactRepository.save(contact);
    }

    public void deleteContact(Long managerId, Long contactId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));

        checkManagerAccess(manager, contact.getClique());

        contactRepository.delete(contact);
    }


    private void checkManagerAccess(User user, Clique clique) {
    if (!clique.getManagers().contains(user)) {
        throw new AccessDeniedException("User does not have manager access to this clique.");
    }
}
    
}