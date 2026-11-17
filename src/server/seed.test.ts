import { describe, expect, it } from "vitest";

import { CLIENT_COUNT } from "../config";
import { Role, UserStatus } from "../domain/authz";
import { ClientStatus } from "../domain/client";
import { createSeedClients, createSeedUsers } from "./seed";

describe("createSeedUsers", () => {
  const users = createSeedUsers();

  it("seeds thirteen users", () => {
    expect(users).toHaveLength(13);
  });

  it("seeds exactly two active IT accounts", () => {
    const activeIt = users.filter(
      (person) => person.role === Role.IT && person.status === UserStatus.ACTIVE,
    );

    expect(activeIt).toHaveLength(2);
  });

  it("gives Anna four direct reports and Ira none", () => {
    const reportsOf = (managerId: string) =>
      users.filter((person) => person.managerId === managerId);

    expect(reportsOf("user_anna")).toHaveLength(4);
    expect(reportsOf("user_ira")).toHaveLength(0);
  });

  it("includes a deactivated user", () => {
    const deactivatedUser = users.find(
      (person) =>
        person.role === Role.USER && person.status === UserStatus.DEACTIVATED,
    );

    expect(deactivatedUser).toBeDefined();
  });

  it("includes a user whose manager is deactivated", () => {
    const byId = new Map(users.map((person) => [person.id, person]));

    const orphaned = users.find((person) => {
      if (person.managerId === null) {
        return false;
      }

      return byId.get(person.managerId)?.status === UserStatus.DEACTIVATED;
    });

    expect(orphaned).toBeDefined();
  });
});

describe("createSeedClients", () => {
  it("generates more than a thousand clients", () => {
    expect(createSeedClients().length).toBeGreaterThan(1000);
  });

  it("includes both active and churned clients", () => {
    const clients = createSeedClients();

    expect(
      clients.some((client) => client.status === ClientStatus.ACTIVE),
    ).toBe(true);
    expect(
      clients.some((client) => client.status === ClientStatus.CHURNED),
    ).toBe(true);
  });

  it("is deterministic and does not accumulate on repeated calls", () => {
    const first = createSeedClients();
    const second = createSeedClients();

    expect(first).toHaveLength(CLIENT_COUNT);
    expect(second).toHaveLength(CLIENT_COUNT);
    expect(second[0].id).toBe(first[0].id);
  });
});
