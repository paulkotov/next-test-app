import { describe, expect, it } from "vitest";

import {
  ActionType,
  Denial,
  Role,
  UserStatus,
  authorize,
  landingPathFor,
  listVisibleUsers,
  navigationFor,
  type AuthzResult,
} from "./authz";
import { toPublicUser, type User } from "./user";

const createdAt = "2026-01-15T09:00:00.000Z";

function user(
  partial: Pick<User, "id" | "fullName" | "role"> & Partial<User>,
): User {
  return {
    email: `${partial.id}@example.com`,
    status: UserStatus.ACTIVE,
    managerId: null,
    password: `${partial.id}-pass`,
    createdAt,
    ...partial,
  };
}

const ivan = user({
  id: "user_ivan",
  fullName: "Ivan Petrenko",
  role: Role.IT,
});
const sofia = user({
  id: "user_sofia",
  fullName: "Sofia Melnyk",
  role: Role.IT,
});
const anna = user({
  id: "user_anna",
  fullName: "Anna Koval",
  role: Role.MANAGER,
});
const marko = user({
  id: "user_marko",
  fullName: "Marko Shevchenko",
  role: Role.MANAGER,
});
const ira = user({
  id: "user_ira",
  fullName: "Ira Bondar",
  role: Role.MANAGER,
});
const olena = user({
  id: "user_olena",
  fullName: "Olena Tkachenko",
  role: Role.USER,
  managerId: anna.id,
});
const pavlo = user({
  id: "user_pavlo",
  fullName: "Pavlo Hrytsenko",
  role: Role.USER,
  managerId: anna.id,
});
const marta = user({
  id: "user_marta",
  fullName: "Marta Sydorenko",
  role: Role.USER,
  managerId: anna.id,
});
const yulia = user({
  id: "user_yulia",
  fullName: "Yulia Kravets",
  role: Role.USER,
  managerId: anna.id,
});
const dmytro = user({
  id: "user_dmytro",
  fullName: "Dmytro Savchuk",
  role: Role.USER,
  managerId: marko.id,
});
const nazar = user({
  id: "user_nazar",
  fullName: "Nazar Polishchuk",
  role: Role.USER,
  status: UserStatus.DEACTIVATED,
});
const taras = user({
  id: "user_taras",
  fullName: "Taras Boyko",
  role: Role.MANAGER,
  status: UserStatus.DEACTIVATED,
});
const iryna = user({
  id: "user_iryna",
  fullName: "Iryna Lysenko",
  role: Role.USER,
  managerId: taras.id,
});

const people = [
  ivan,
  sofia,
  anna,
  marko,
  ira,
  olena,
  pavlo,
  marta,
  yulia,
  dmytro,
  nazar,
  taras,
  iryna,
];

const onlyIvanIsActiveIt = people.map((person) =>
  person.id === sofia.id
    ? { ...person, status: UserStatus.DEACTIVATED }
    : person,
);

function denial(reason: (typeof Denial)[keyof typeof Denial]): AuthzResult {
  return { ok: false, status: 403, code: reason.code, message: reason.message };
}

describe("authorize", () => {
  it("rejects a manager creating a user, changing a role, or changing a status", () => {
    expect(authorize(anna, { type: ActionType.CREATE_USER }, people)).toEqual(
      denial(Denial.FORBIDDEN),
    );
    expect(
      authorize(
        anna,
        { type: ActionType.CHANGE_ROLE, target: olena, nextRole: Role.IT },
        people,
      ),
    ).toEqual(denial(Denial.FORBIDDEN));
    expect(
      authorize(
        anna,
        {
          type: ActionType.CHANGE_STATUS,
          target: olena,
          nextStatus: UserStatus.DEACTIVATED,
        },
        people,
      ),
    ).toEqual(denial(Denial.FORBIDDEN));
  });

  it("allows IT to create a user", () => {
    expect(authorize(ivan, { type: ActionType.CREATE_USER }, people)).toEqual({
      ok: true,
    });
  });

  it("allows Anna to edit Olena's profile and nobody outside her reports", () => {
    expect(
      authorize(anna, { type: ActionType.UPDATE_PROFILE, target: olena }, people),
    ).toEqual({ ok: true });

    for (const target of [dmytro, ira, nazar, anna]) {
      expect(
        authorize(anna, { type: ActionType.UPDATE_PROFILE, target }, people),
      ).toEqual(denial(Denial.FORBIDDEN));
    }
  });

  it("allows IT to edit anyone's profile, including their own", () => {
    for (const target of [anna, dmytro, nazar, ivan]) {
      expect(
        authorize(ivan, { type: ActionType.UPDATE_PROFILE, target }, people),
      ).toEqual({ ok: true });
    }
  });

  it("blocks Ivan from deactivating himself while Sofia is still an active IT", () => {
    expect(
      authorize(
        ivan,
        { type: ActionType.CHANGE_STATUS, target: ivan, nextStatus: UserStatus.DEACTIVATED },
        people,
      ),
    ).toEqual(
      denial(Denial.OWN_ACCOUNT),
    );
  });

  it("allows Ivan to deactivate Sofia", () => {
    expect(
      authorize(
        ivan,
        {
          type: ActionType.CHANGE_STATUS,
          target: sofia,
          nextStatus: UserStatus.DEACTIVATED,
        },
        people,
      ),
    ).toEqual({ ok: true });
  });

  it("blocks the last active IT from deactivating themselves with a distinct reason", () => {
    const result = authorize(
      ivan,
      { type: ActionType.CHANGE_STATUS, target: ivan, nextStatus: UserStatus.DEACTIVATED },
      onlyIvanIsActiveIt,
    );

    expect(result).toEqual(
      denial(Denial.LAST_ACTIVE_IT),
    );
    expect(result).not.toEqual(
      denial(Denial.OWN_ACCOUNT),
    );
  });

  it("blocks the last active IT from changing their own role", () => {
    expect(
      authorize(
        ivan,
        { type: ActionType.CHANGE_ROLE, target: ivan, nextRole: Role.MANAGER },
        onlyIvanIsActiveIt,
      ),
    ).toEqual(
      denial(Denial.LAST_ACTIVE_IT),
    );
  });

  it("blocks an IT from changing their own role while another IT is active", () => {
    expect(
      authorize(
        ivan,
        { type: ActionType.CHANGE_ROLE, target: ivan, nextRole: Role.MANAGER },
        people,
      ),
    ).toEqual(
      denial(Denial.OWN_ACCOUNT),
    );
  });

  it("allows a user to view content and refuses IT", () => {
    expect(authorize(olena, { type: ActionType.VIEW_CONTENT }, people)).toEqual({
      ok: true,
    });
    expect(authorize(ivan, { type: ActionType.VIEW_CONTENT }, people)).toEqual(
      denial(Denial.FORBIDDEN),
    );
  });
});

describe("listVisibleUsers", () => {
  it("shows Anna only her four direct reports", () => {
    const result = listVisibleUsers(anna, people);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.users.map((person) => person.id).sort()).toEqual([
      "user_marta",
      "user_olena",
      "user_pavlo",
      "user_yulia",
    ]);
  });

  it("shows Ivan every user and hides the directory from Olena", () => {
    const ivanResult = listVisibleUsers(ivan, people);

    expect(ivanResult.ok).toBe(true);
    if (!ivanResult.ok) {
      return;
    }

    expect(ivanResult.users.map((person) => person.id)).toEqual(
      people.map((person) => person.id),
    );
    expect(listVisibleUsers(olena, people)).toEqual(
      denial(Denial.FORBIDDEN),
    );
  });
});

describe("navigationFor", () => {
  it("gives IT only the team directory", () => {
    expect(navigationFor(ivan)).toEqual([{ href: "/manage-users", label: "Team" }]);
  });

  it("gives a manager content, profile and the team directory", () => {
    expect(navigationFor(anna).map((link) => link.href)).toEqual([
      "/content",
      "/content/me",
      "/manage-users",
    ]);
  });

  it("gives a plain user content and profile only", () => {
    expect(navigationFor(olena).map((link) => link.href)).toEqual([
      "/content",
      "/content/me",
    ]);
  });
});

describe("landingPathFor", () => {
  it("sends IT to the team directory and everyone else to content", () => {
    expect(landingPathFor(ivan)).toBe("/manage-users");
    expect(landingPathFor(anna)).toBe("/content");
    expect(landingPathFor(olena)).toBe("/content");
  });
});

describe("toPublicUser", () => {
  it("drops the password", () => {
    expect(ivan.password).toBe("user_ivan-pass");
    expect(toPublicUser(ivan)).not.toHaveProperty("password");
  });
});
