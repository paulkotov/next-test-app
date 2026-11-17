import { beforeEach, describe, expect, it } from "vitest";

import { Denial } from "@/domain/authz";
import { CLIENT_COUNT } from "@/config";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getClientFor,
  listClients,
} from "@/server/clients";
import { getClients, getUserById, resetStore } from "@/server/store";

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

describe("listClients", () => {
  it("returns a single server-side page, not the whole array", () => {
    const result = listClients(actor("user_anna"), 2, 20);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.page.items).toHaveLength(20);
    expect(result.page.page).toBe(2);
    expect(result.page.limit).toBe(20);
    expect(result.page.total).toBe(CLIENT_COUNT);
  });

  it("returns a different slice on page 2 than on page 1", () => {
    const first = listClients(actor("user_anna"), 1, 20);
    const second = listClients(actor("user_anna"), 2, 20);

    if (!first.ok || !second.ok) {
      throw new Error("expected both pages to be allowed");
    }

    const firstIds = first.page.items.map((client) => client.id);
    const secondIds = second.page.items.map((client) => client.id);

    expect(secondIds).not.toEqual(firstIds);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it("lets a plain user view content too", () => {
    const result = listClients(actor("user_olena"), 1, 20);

    expect(result.ok).toBe(true);
  });

  it("forbids IT from the clients directory", () => {
    const result = listClients(actor("user_ivan"), 1, 20);

    expect(result).toMatchObject({ ok: false, code: Denial.FORBIDDEN.code });
  });

  it("falls back to the default limit for a non-positive or invalid limit", () => {
    const result = listClients(actor("user_anna"), 1, 0);

    if (!result.ok) {
      throw new Error("expected the page to be allowed");
    }

    expect(result.page.limit).toBe(DEFAULT_LIMIT);
    expect(result.page.items).toHaveLength(DEFAULT_LIMIT);
  });

  it("caps the limit at the maximum", () => {
    const result = listClients(actor("user_anna"), 1, 500);

    if (!result.ok) {
      throw new Error("expected the page to be allowed");
    }

    expect(result.page.limit).toBe(MAX_LIMIT);
    expect(result.page.items).toHaveLength(MAX_LIMIT);
  });

  it("clamps a non-positive page to the first page", () => {
    const result = listClients(actor("user_anna"), 0, 20);

    if (!result.ok) {
      throw new Error("expected the page to be allowed");
    }

    expect(result.page.page).toBe(1);
  });

  it("returns an empty slice but the real total past the last page", () => {
    const result = listClients(actor("user_anna"), 1_000_000, 20);

    if (!result.ok) {
      throw new Error("expected the page to be allowed");
    }

    expect(result.page.items).toHaveLength(0);
    expect(result.page.total).toBe(CLIENT_COUNT);
  });
});

describe("getClientFor", () => {
  it("returns a client the actor is allowed to see", () => {
    const sample = getClients()[0];

    const result = getClientFor(actor("user_anna"), sample.id);

    expect(result).toMatchObject({ ok: true, client: { id: sample.id } });
  });

  it("returns 404 for an unknown client", () => {
    const result = getClientFor(actor("user_anna"), "missing-client");

    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("forbids IT even for a real client id", () => {
    const sample = getClients()[0];

    const result = getClientFor(actor("user_ivan"), sample.id);

    expect(result).toMatchObject({ ok: false, code: Denial.FORBIDDEN.code });
  });
});
