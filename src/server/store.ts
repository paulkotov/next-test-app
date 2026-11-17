import "server-only";

import type { Client } from "@/domain/client";
import type { User } from "@/domain/user";
import { createSeedClients, createSeedUsers } from "@/server/seed";

/**
 * In-memory data, pinned on `globalThis` so route handlers and server
 * components share one instance even when Next compiles them into separate
 * module graphs. Without this, a mutation through the API would be invisible to
 * the pages (and vice versa). Resets whenever the server restarts.
 */
type StoreState = { users: User[]; clients: Client[] };

const globalForStore = globalThis as typeof globalThis & {
  __store?: StoreState;
};

const state: StoreState = (globalForStore.__store ??= {
  users: createSeedUsers(),
  clients: createSeedClients(),
});

export function getUsers(): User[] {
  return state.users;
}

export function getClients(): Client[] {
  return state.clients;
}

export function getClientById(id: string): Client | undefined {
  return state.clients.find((client) => client.id === id);
}

export function getUserById(id: string): User | undefined {
  return state.users.find((person) => person.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return state.users.find((person) => person.email.toLowerCase() === normalized);
}

export function insertUser(user: User): void {
  state.users.push(user);
}

export function updateUser(
  id: string,
  patch: Partial<Omit<User, "id">>,
): User | undefined {
  const index = state.users.findIndex((person) => person.id === id);

  if (index === -1) {
    return undefined;
  }

  const updated: User = { ...state.users[index], ...patch, id };
  state.users[index] = updated;
  return updated;
}

export function resetStore(): void {
  state.users = createSeedUsers();
  state.clients = createSeedClients();
}
