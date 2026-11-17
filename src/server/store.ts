import "server-only";

import type { Client } from "@/domain/client";
import type { User } from "@/domain/user";
import { createSeedClients, createSeedUsers } from "@/server/seed";

let users: User[] = createSeedUsers();
let clients: Client[] = createSeedClients();

export function getUsers(): User[] {
  return users;
}

export function getClients(): Client[] {
  return clients;
}

export function getClientById(id: string): Client | undefined {
  return clients.find((client) => client.id === id);
}

export function getUserById(id: string): User | undefined {
  return users.find((person) => person.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((person) => person.email.toLowerCase() === normalized);
}

export function insertUser(user: User): void {
  users.push(user);
}

export function updateUser(
  id: string,
  patch: Partial<Omit<User, "id">>,
): User | undefined {
  const index = users.findIndex((person) => person.id === id);

  if (index === -1) {
    return undefined;
  }

  const updated: User = { ...users[index], ...patch, id };
  users[index] = updated;
  return updated;
}

export function resetStore(): void {
  users = createSeedUsers();
  clients = createSeedClients();
}
