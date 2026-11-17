import type { User } from "@/domain/user";
import { readSessionId, resolveSession } from "@/server/session";
import { getUserById, getUsers } from "@/server/store";

/**
 * Resolves the full signed-in user for an API route straight from the request
 * cookie, so handlers stay callable in tests without a running server.
 *
 * Returns `null` when there is no session or the account was deactivated —
 * `resolveSession` drops the session in that case, enforcing immediate logout.
 */
export function userFromRequest(request: Request): User | null {
  const sessionId = readSessionId(request.headers.get("cookie"));
  const publicUser = resolveSession(sessionId, getUsers());

  if (!publicUser) {
    return null;
  }

  return getUserById(publicUser.id) ?? null;
}
