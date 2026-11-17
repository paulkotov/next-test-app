import { beforeEach, describe, expect, it } from "vitest";

import { Denial, Role, UserStatus } from "@/domain/authz";
import { GET as clientGet } from "@/app/api/clients/[id]/route";
import { GET as clientsGet } from "@/app/api/clients/route";
import {
  DELETE as sessionDelete,
  POST as sessionPost,
} from "@/app/api/session/route";
import { PATCH as userPatch } from "@/app/api/users/[id]/route";
import { GET as usersGet, POST as usersPost } from "@/app/api/users/route";
import { getUserById, resetStore } from "@/server/store";

const ORIGIN = "http://localhost";

type Json = Record<string, unknown>;

/** Build a request, attaching a Cookie header and JSON body only when given. */
function request(
  path: string,
  method: string,
  options: { cookie?: string; body?: Json } = {},
): Request {
  const headers: Record<string, string> = {};

  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

/** Log in through the real route and return the `session=<id>` cookie value. */
async function login(email: string, password: string): Promise<string> {
  const response = await sessionPost(
    request("/api/session", "POST", { body: { email, password } }),
  );

  expect(response.status).toBe(200);

  const setCookie = response.headers.get("set-cookie");

  if (!setCookie) {
    throw new Error("login did not set a session cookie");
  }

  return setCookie.split(";")[0];
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function readBody(response: Response): Promise<Json> {
  return (await response.json()) as Json;
}

function errorCode(body: Json): unknown {
  return (body.error as Json | undefined)?.code;
}

beforeEach(() => {
  resetStore();
});

describe("graded user scenarios over HTTP", () => {
  it("shows a manager exactly their own direct reports", async () => {
    const cookie = await login("anna@example.com", "anna-pass");

    const response = await usersGet(request("/api/users", "GET", { cookie }));
    const body = await readBody(response);
    const ids = (body.users as { id: string }[]).map((user) => user.id).sort();

    expect(response.status).toBe(200);
    expect(ids).toEqual([
      "user_marta",
      "user_olena",
      "user_pavlo",
      "user_yulia",
    ]);
  });

  it("forbids a manager from editing another manager's report", async () => {
    const cookie = await login("anna@example.com", "anna-pass");
    const before = getUserById("user_dmytro")?.fullName;

    const response = await userPatch(
      request("/api/users/user_dmytro", "PATCH", {
        cookie,
        body: { fullName: "Hacked" },
      }),
      params("user_dmytro"),
    );

    expect(response.status).toBe(403);
    expect(errorCode(await readBody(response))).toBe(Denial.FORBIDDEN.code);
    expect(getUserById("user_dmytro")?.fullName).toBe(before);
  });

  it("forbids a manager from promoting themselves to IT", async () => {
    const cookie = await login("anna@example.com", "anna-pass");

    const response = await userPatch(
      request("/api/users/user_anna", "PATCH", {
        cookie,
        body: { role: Role.IT },
      }),
      params("user_anna"),
    );

    expect(response.status).toBe(403);
    expect(getUserById("user_anna")?.role).toBe(Role.MANAGER);
  });

  it("lets IT create a user that then appears to their manager", async () => {
    const cookie = await login("ivan@example.com", "ivan-pass");

    const created = await usersPost(
      request("/api/users", "POST", {
        cookie,
        body: {
          fullName: "New Report",
          email: "new.report@example.com",
          password: "new-pass",
          role: Role.USER,
          status: UserStatus.ACTIVE,
          managerId: "user_anna",
        },
      }),
    );
    expect(created.status).toBe(201);

    const annaCookie = await login("anna@example.com", "anna-pass");
    const list = await usersGet(request("/api/users", "GET", { cookie: annaCookie }));
    const body = await readBody(list);
    const emails = (body.users as { email: string }[]).map((user) => user.email);

    expect(emails).toContain("new.report@example.com");
  });
});

describe("graded client scenarios over HTTP", () => {
  it("returns one real page of clients to a manager", async () => {
    const cookie = await login("anna@example.com", "anna-pass");

    const first = await readBody(
      await clientsGet(request("/api/clients?page=1&limit=20", "GET", { cookie })),
    );
    const secondResponse = await clientsGet(
      request("/api/clients?page=2&limit=20", "GET", { cookie }),
    );
    const second = await readBody(secondResponse);

    expect(secondResponse.status).toBe(200);
    expect((second.items as unknown[]).length).toBe(20);
    expect(second.total as number).toBeGreaterThan(1000);

    const firstId = (first.items as { id: string }[])[0].id;
    const secondId = (second.items as { id: string }[])[0].id;
    expect(secondId).not.toBe(firstId);
  });

  it("returns a single client by an id from the page", async () => {
    const cookie = await login("anna@example.com", "anna-pass");

    const page = await readBody(
      await clientsGet(request("/api/clients?page=1&limit=20", "GET", { cookie })),
    );
    const sampleId = (page.items as { id: string }[])[0].id;

    const response = await clientGet(
      request(`/api/clients/${sampleId}`, "GET", { cookie }),
      params(sampleId),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect((body.client as { id: string }).id).toBe(sampleId);
  });

  it("forbids IT from the clients directory", async () => {
    const cookie = await login("ivan@example.com", "ivan-pass");

    const response = await clientsGet(
      request("/api/clients?page=1&limit=20", "GET", { cookie }),
    );

    expect(response.status).toBe(403);
    expect(errorCode(await readBody(response))).toBe(Denial.FORBIDDEN.code);
  });

  it("rejects an anonymous client request", async () => {
    const response = await clientsGet(
      request("/api/clients?page=1&limit=20", "GET"),
    );

    expect(response.status).toBe(401);
    expect(errorCode(await readBody(response))).toBe("UNAUTHENTICATED");
  });
});

describe("self-protection and immediate deactivation over HTTP", () => {
  it("blocks IT from deactivating themselves while another IT is active", async () => {
    const cookie = await login("ivan@example.com", "ivan-pass");

    const response = await userPatch(
      request("/api/users/user_ivan", "PATCH", {
        cookie,
        body: { status: UserStatus.DEACTIVATED },
      }),
      params("user_ivan"),
    );

    expect(response.status).toBe(403);
    expect(errorCode(await readBody(response))).toBe(Denial.OWN_ACCOUNT.code);
    expect(getUserById("user_ivan")?.status).toBe(UserStatus.ACTIVE);
  });

  it("blocks removing the last active IT with a distinct reason", async () => {
    const cookie = await login("ivan@example.com", "ivan-pass");

    const deactivateSofia = await userPatch(
      request("/api/users/user_sofia", "PATCH", {
        cookie,
        body: { status: UserStatus.DEACTIVATED },
      }),
      params("user_sofia"),
    );
    expect(deactivateSofia.status).toBe(200);
    expect(getUserById("user_sofia")?.status).toBe(UserStatus.DEACTIVATED);

    const deactivateSelf = await userPatch(
      request("/api/users/user_ivan", "PATCH", {
        cookie,
        body: { status: UserStatus.DEACTIVATED },
      }),
      params("user_ivan"),
    );
    const body = await readBody(deactivateSelf);

    expect(deactivateSelf.status).toBe(403);
    expect(errorCode(body)).toBe(Denial.LAST_ACTIVE_IT.code);
    expect((body.error as Json).message).not.toBe(Denial.OWN_ACCOUNT.message);
    expect(getUserById("user_ivan")?.status).toBe(UserStatus.ACTIVE);
  });

  it("logs a user out on the next request after they are deactivated", async () => {
    const olenaCookie = await login("olena@example.com", "olena-pass");

    const before = await clientsGet(
      request("/api/clients?page=1&limit=20", "GET", { cookie: olenaCookie }),
    );
    expect(before.status).toBe(200);

    const itCookie = await login("ivan@example.com", "ivan-pass");
    const deactivate = await userPatch(
      request("/api/users/user_olena", "PATCH", {
        cookie: itCookie,
        body: { status: UserStatus.DEACTIVATED },
      }),
      params("user_olena"),
    );
    expect(deactivate.status).toBe(200);

    const after = await clientsGet(
      request("/api/clients?page=1&limit=20", "GET", { cookie: olenaCookie }),
    );
    expect(after.status).toBe(401);
    expect(errorCode(await readBody(after))).toBe("UNAUTHENTICATED");
  });

  it("clears the session cookie on logout", async () => {
    const cookie = await login("anna@example.com", "anna-pass");

    const response = await sessionDelete(
      request("/api/session", "DELETE", { cookie }),
    );
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(setCookie).toContain("Max-Age=0");

    const afterLogout = await usersGet(request("/api/users", "GET", { cookie }));
    expect(afterLogout.status).toBe(401);
  });
});
