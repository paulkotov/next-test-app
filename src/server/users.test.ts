import { beforeEach, describe, expect, it } from "vitest";

import { Denial, Role, UserStatus } from "@/domain/authz";
import { createUser, listUsersFor, updateUserAccount } from "@/server/users";
import { getUserById, resetStore } from "@/server/store";

function actor(id: string) {
  const user = getUserById(id);

  if (!user) {
    throw new Error(`Seed user ${id} is missing`);
  }

  return user;
}

beforeEach(() => {
  resetStore();
});

describe("listUsersFor", () => {
  it("returns Anna's four direct reports", () => {
    const result = listUsersFor(actor("user_anna"));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.user.map((person) => person.id).sort()).toEqual([
      "user_marta",
      "user_olena",
      "user_pavlo",
      "user_yulia",
    ]);
  });
});

describe("updateUserAccount", () => {
  it("lets Anna change her own report's email", () => {
    const result = updateUserAccount(actor("user_anna"), "user_olena", {
      email: "olena.new@example.com",
    });

    expect(result.ok).toBe(true);
    expect(getUserById("user_olena")?.email).toBe("olena.new@example.com");
  });

  it("forbids Anna from editing someone else's report and keeps data intact", () => {
    const before = getUserById("user_dmytro")?.fullName;

    const result = updateUserAccount(actor("user_anna"), "user_dmytro", {
      fullName: "Hacked",
    });

    expect(result).toMatchObject({ ok: false, code: Denial.FORBIDDEN.code });
    expect(getUserById("user_dmytro")?.fullName).toBe(before);
  });

  it("forbids Anna from promoting herself to IT", () => {
    const result = updateUserAccount(actor("user_anna"), "user_anna", {
      role: Role.IT,
    });

    expect(result).toMatchObject({ ok: false, code: Denial.FORBIDDEN.code });
    expect(getUserById("user_anna")?.role).toBe(Role.MANAGER);
  });

  it("blocks Ivan from deactivating himself while Sofia is active", () => {
    const result = updateUserAccount(actor("user_ivan"), "user_ivan", {
      status: UserStatus.DEACTIVATED,
    });

    expect(result).toMatchObject({ ok: false, code: Denial.OWN_ACCOUNT.code });
    expect(getUserById("user_ivan")?.status).toBe(UserStatus.ACTIVE);
  });

  it("lets Ivan deactivate Sofia, then blocks deactivating the last active IT", () => {
    const deactivateSofia = updateUserAccount(actor("user_ivan"), "user_sofia", {
      status: UserStatus.DEACTIVATED,
    });
    expect(deactivateSofia.ok).toBe(true);
    expect(getUserById("user_sofia")?.status).toBe(UserStatus.DEACTIVATED);

    const deactivateSelf = updateUserAccount(actor("user_ivan"), "user_ivan", {
      status: UserStatus.DEACTIVATED,
    });
    expect(deactivateSelf).toMatchObject({
      ok: false,
      code: Denial.LAST_ACTIVE_IT.code,
    });
    expect(getUserById("user_ivan")?.status).toBe(UserStatus.ACTIVE);
  });

  it("returns 404 for an unknown target", () => {
    const result = updateUserAccount(actor("user_ivan"), "user_ghost", {
      fullName: "Ghost",
    });

    expect(result).toMatchObject({ ok: false, status: 404 });
  });
});

describe("createUser", () => {
  it("forbids a plain user from creating accounts", () => {
    const result = createUser(actor("user_olena"), {
      fullName: "New Person",
      email: "new@example.com",
      password: "new-pass",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      managerId: null,
    });

    expect(result).toMatchObject({ ok: false, code: Denial.FORBIDDEN.code });
  });

  it("lets IT create a user and rejects a duplicate email", () => {
    const created = createUser(actor("user_ivan"), {
      fullName: "New Person",
      email: "new@example.com",
      password: "new-pass",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      managerId: "user_anna",
    });
    expect(created.ok).toBe(true);

    const duplicate = createUser(actor("user_ivan"), {
      fullName: "Another Person",
      email: "NEW@example.com",
      password: "other-pass",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      managerId: null,
    });
    expect(duplicate).toMatchObject({ ok: false, status: 409 });
  });
});
