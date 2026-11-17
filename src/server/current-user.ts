import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/config";
import type { PublicUser } from "@/domain/user";
import { resolveSession } from "@/server/session";
import { getUsers } from "@/server/store";

export async function readSessionUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  return resolveSession(sessionId, getUsers());
}
