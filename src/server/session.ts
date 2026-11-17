import { SESSION_COOKIE } from "@/config";
import { UserStatus } from "@/domain/authz";
import { toPublicUser, type PublicUser, type User } from "@/domain/user";

/**
 * Opaque session store: a random id maps to a user id, and nothing else.
 *
 * Role and status are deliberately NOT stored here. Every request re-reads the
 * live user from the data store, so a deactivation takes effect on the very
 * next request instead of the next login.
 *
 * Pinned on `globalThis` so route handlers and server components — which Next
 * can compile into separate module graphs — share the one Map instead of each
 * getting their own empty copy.
 */
const globalForSessions = globalThis as typeof globalThis & {
  __sessions?: Map<string, string>;
};

const sessions: Map<string, string> = (globalForSessions.__sessions ??=
  new Map<string, string>());

export const UNAUTHENTICATED = {
  code: "UNAUTHENTICATED",
  message: "Sign in is required.",
} as const;

export const LOGIN_FAILED = {
  code: "UNAUTHENTICATED",
  message: "Email or password is wrong, or the account is deactivated.",
} as const;

export function createSession(userId: string): string {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, userId);
  return sessionId;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function resolveSession(
  sessionId: string | null | undefined,
  users: readonly User[],
): PublicUser | null {
  if (!sessionId) {
    return null;
  }

  const userId = sessions.get(sessionId);

  if (userId === undefined) {
    return null;
  }

  const user = users.find((person) => person.id === userId);

  if (!user || user.status !== UserStatus.ACTIVE) {
    sessions.delete(sessionId);
    return null;
  }

  return toPublicUser(user);
}

export function authenticate(
  email: string,
  password: string,
  users: readonly User[],
): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(
    (person) => person.email.toLowerCase() === normalizedEmail,
  );

  if (
    !user ||
    user.status !== UserStatus.ACTIVE ||
    user.password !== password
  ) {
    return null;
  }

  return user;
}

export function readSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");

    if (name === SESSION_COOKIE) {
      return rest.join("=") || null;
    }
  }

  return null;
}

export function serializeSessionCookie(sessionId: string): string {
  return `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
