import { toPublicUser } from "@/domain/user";
import {
  LOGIN_FAILED,
  authenticate,
  clearSessionCookie,
  createSession,
  destroySession,
  readSessionId,
  serializeSessionCookie,
} from "@/server/session";
import { getUsers } from "@/server/store";

type Credentials = { email: string; password: string };

function readCredentials(body: unknown): Credentials | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  return { email, password };
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const credentials = readCredentials(body);

  if (!credentials) {
    return json({ error: LOGIN_FAILED }, { status: 401 });
  }

  const user = authenticate(
    credentials.email,
    credentials.password,
    getUsers(),
  );

  if (!user) {
    return json({ error: LOGIN_FAILED }, { status: 401 });
  }

  const sessionId = createSession(user.id);

  return json(
    { user: toPublicUser(user) },
    { status: 200, headers: { "Set-Cookie": serializeSessionCookie(sessionId) } },
  );
}

export async function DELETE(request: Request): Promise<Response> {
  const sessionId = readSessionId(request.headers.get("cookie"));

  if (sessionId) {
    destroySession(sessionId);
  }

  return json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": clearSessionCookie() } },
  );
}
