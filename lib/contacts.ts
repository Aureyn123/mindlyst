// Gestion des contacts
import crypto from "crypto";
import { readJson, writeJson } from "./db";
import { readUsers } from "./auth";

export type Contact = {
  id: string;
  userId: string; // Utilisateur qui a ajouté ce contact
  contactUserId: string; // ID de l'utilisateur contact
  contactUsername: string; // Pseudo du contact (pour affichage rapide)
  contactEmail: string; // Email du contact (pour affichage)
  createdAt: number;
};

export type ContactRequest = {
  id: string;
  requesterId: string; // ID de l'utilisateur qui demande
  requesterUsername: string; // Pseudo du demandeur
  requesterEmail: string; // Email du demandeur
  recipientId: string; // ID de l'utilisateur qui reçoit la demande
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

const CONTACTS_FILE = "contacts.json";
const CONTACT_REQUESTS_FILE = "contact-requests.json";

async function loadContacts(): Promise<Contact[]> {
  return readJson<Contact[]>(CONTACTS_FILE, []);
}

async function saveContacts(contacts: Contact[]): Promise<void> {
  await writeJson(CONTACTS_FILE, contacts);
}

async function loadContactRequests(): Promise<ContactRequest[]> {
  return readJson<ContactRequest[]>(CONTACT_REQUESTS_FILE, []);
}

async function saveContactRequests(requests: ContactRequest[]): Promise<void> {
  await writeJson(CONTACT_REQUESTS_FILE, requests);
}

export async function getUserContacts(userId: string): Promise<Contact[]> {
  const contacts = await loadContacts();
  return contacts.filter((c) => c.userId === userId);
}

export async function createContactRequest(requesterId: string, recipientId: string): Promise<ContactRequest> {
  // Vérifier qu'on ne s'ajoute pas soi-même
  if (requesterId === recipientId) {
    throw new Error("Tu ne peux pas t'ajouter toi-même comme contact");
  }

  // Vérifier que le contact n'existe pas déjà
  const contacts = await loadContacts();
  const existingContact = contacts.find(
    (c) => (c.userId === requesterId && c.contactUserId === recipientId) ||
           (c.userId === recipientId && c.contactUserId === requesterId)
  );
  if (existingContact) {
    throw new Error("Ce contact existe déjà");
  }

  // Vérifier qu'il n'y a pas déjà une demande en attente
  const requests = await loadContactRequests();
  const existingRequest = requests.find(
    (r) => r.requesterId === requesterId && r.recipientId === recipientId && r.status === "pending"
  );
  if (existingRequest) {
    throw new Error("Une demande est déjà en attente");
  }

  // Récupérer les infos du demandeur
  const users = await readUsers();
  const requesterUser = users.find((u) => u.id === requesterId);
  if (!requesterUser) {
    throw new Error("Utilisateur non trouvé");
  }

  const newRequest: ContactRequest = {
    id: crypto.randomUUID(),
    requesterId,
    requesterUsername: requesterUser.username,
    requesterEmail: requesterUser.email,
    recipientId,
    status: "pending",
    createdAt: Date.now(),
  };

  requests.push(newRequest);
  await saveContactRequests(requests);
  return newRequest;
}

export async function acceptContactRequest(requestId: string, userId: string): Promise<Contact> {
  const requests = await loadContactRequests();
  const request = requests.find((r) => r.id === requestId && r.recipientId === userId && r.status === "pending");
  
  if (!request) {
    throw new Error("Demande non trouvée ou déjà traitée");
  }

  // Marquer la demande comme acceptée
  request.status = "accepted";
  await saveContactRequests(requests);

  // Créer les contacts dans les deux sens (relation bidirectionnelle)
  const contacts = await loadContacts();
  const users = await readUsers();
  
  const requesterUser = users.find((u) => u.id === request.requesterId);
  const recipientUser = users.find((u) => u.id === request.recipientId);
  
  if (!requesterUser || !recipientUser) {
    throw new Error("Utilisateur non trouvé");
  }

  // Contact 1 : requester -> recipient
  const contact1: Contact = {
    id: crypto.randomUUID(),
    userId: request.requesterId,
    contactUserId: request.recipientId,
    contactUsername: recipientUser.username,
    contactEmail: recipientUser.email,
    createdAt: Date.now(),
  };

  // Contact 2 : recipient -> requester
  const contact2: Contact = {
    id: crypto.randomUUID(),
    userId: request.recipientId,
    contactUserId: request.requesterId,
    contactUsername: requesterUser.username,
    contactEmail: requesterUser.email,
    createdAt: Date.now(),
  };

  contacts.push(contact1, contact2);
  await saveContacts(contacts);
  
  return contact2; // Retourner le contact pour l'utilisateur qui a accepté
}

export async function rejectContactRequest(requestId: string, userId: string): Promise<void> {
  const requests = await loadContactRequests();
  const request = requests.find((r) => r.id === requestId && r.recipientId === userId && r.status === "pending");
  
  if (!request) {
    throw new Error("Demande non trouvée ou déjà traitée");
  }

  request.status = "rejected";
  await saveContactRequests(requests);
}

export async function getPendingContactRequests(userId: string): Promise<ContactRequest[]> {
  const requests = await loadContactRequests();
  return requests.filter((r) => r.recipientId === userId && r.status === "pending");
}

export async function addContact(userId: string, contactUserId: string): Promise<Contact | null> {
  // Cette fonction est maintenant obsolète, on utilise createContactRequest à la place
  // Mais on la garde pour la rétrocompatibilité
  const contacts = await loadContacts();
  const existing = contacts.find(
    (c) => c.userId === userId && c.contactUserId === contactUserId
  );
  if (existing) {
    return existing;
  }

  if (userId === contactUserId) {
    throw new Error("Tu ne peux pas t'ajouter toi-même comme contact");
  }

  const users = await readUsers();
  const contactUser = users.find((u) => u.id === contactUserId);
  if (!contactUser) {
    throw new Error("Utilisateur non trouvé");
  }

  const newContact: Contact = {
    id: crypto.randomUUID(),
    userId,
    contactUserId,
    contactUsername: contactUser.username,
    contactEmail: contactUser.email,
    createdAt: Date.now(),
  };

  contacts.push(newContact);
  await saveContacts(contacts);
  return newContact;
}

export async function removeContact(userId: string, contactId: string): Promise<boolean> {
  const contacts = await loadContacts();
  const initialLength = contacts.length;
  const filtered = contacts.filter((c) => !(c.id === contactId && c.userId === userId));
  if (filtered.length === initialLength) {
    return false;
  }
  await saveContacts(filtered);
  return true;
}

export async function findUserByUsername(username: string): Promise<{ id: string; email: string; username: string } | null> {
  const users = await readUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
}

export async function searchUsersByUsername(query: string, excludeUserId: string): Promise<Array<{ id: string; email: string; username: string }>> {
  const users = await readUsers();
  const lowerQuery = query.toLowerCase();
  return users
    .filter((u) => u.id !== excludeUserId && u.username.toLowerCase().includes(lowerQuery))
    .map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
    }))
    .slice(0, 10); // Limiter à 10 résultats
}

