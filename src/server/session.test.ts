import { describe, expect, it } from "vitest";

import { Role, UserStatus } from "@/domain/authz";
import type { User } from "@/domain/user";
import {
  authenticate,
  createSession,
  readSessionId,
  resolveSession,
} from "@/server/session";

function makeUser(overrides: Partial<User> & Pick<User, "id">): User {
  return {
    fullName: "Test User",
    email: `${overrides.id}@example.com`,
    role: Role.USER,
    status: UserStatus.ACTIVE,
    managerId: null,
    password: `${overrides.id}-pass`,
    createdAt: "2026-01-15T09:00:00.000Z",
    ...overrides,
  };
}

describe("resolveSession", () => {
  it("returns the public user (without password) for a valid session", () => {
    const ivan = makeUser({ id: "user_ivan", role: Role.IT });
    const sessionId = createSession(ivan.id);

    const result = resolveSession(sessionId, [ivan]);

    expect(result?.id).toBe("user_ivan");
    expect(result).not.toHaveProperty("password");
  });

  it("expires immediately once the user is deactivated", () => {
    const ivan = makeUser({ id: "user_ivan", role: Role.IT });
    const sessionId = createSession(ivan.id);
    const deactivated: User = { ...ivan, status: UserStatus.DEACTIVATED };

    expect(resolveSession(sessionId, [deactivated])).toBeNull();
    // The session was destroyed, so it stays invalid even if the user is
    // reactivated later.
    expect(resolveSession(sessionId, [ivan])).toBeNull();
  });

  it("returns null for an unknown session id", () => {
    expect(resolveSession("does-not-exist", [])).toBeNull();
    expect(resolveSession(null, [])).toBeNull();
  });
});

describe("authenticate", () => {
  const ivan = makeUser({
    id: "user_ivan",
    email: "ivan@example.com",
    password: "ivan-pass",
    role: Role.IT,
  });
  const nazar = makeUser({
    id: "user_nazar",
    email: "nazar@example.com",
    password: "nazar-pass",
    status: UserStatus.DEACTIVATED,
  });
  const users = [ivan, nazar];

  it("accepts a correct email and password, ignoring case and spaces", () => {
    expect(authenticate("  IVAN@Example.com ", "ivan-pass", users)?.id).toBe(
      "user_ivan",
    );
  });

  it("rejects a wrong password", () => {
    expect(authenticate("ivan@example.com", "nope", users)).toBeNull();
  });

  it("rejects an unknown email", () => {
    expect(authenticate("ghost@example.com", "whatever", users)).toBeNull();
  });

  it("rejects a deactivated account", () => {
    expect(authenticate("nazar@example.com", "nazar-pass", users)).toBeNull();
  });
});

describe("readSessionId", () => {
  it("extracts the session id from a Cookie header", () => {
    expect(readSessionId("session=abc123; theme=dark")).toBe("abc123");
  });

  it("returns null when the cookie is absent", () => {
    expect(readSessionId("theme=dark")).toBeNull();
    expect(readSessionId(null)).toBeNull();
  });
});
