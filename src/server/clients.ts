import { ActionType, authorize, type Denied } from "@/domain/authz";
import type { Client, Page } from "@/domain/client";
import type { PublicUser } from "@/domain/user";
import { getClientById, getClients, getUsers } from "@/server/store";

/** Page size used when the request omits `limit` or sends an invalid one. */
export const DEFAULT_LIMIT = 20;

/** Hard ceiling so a single request can never pull the whole directory. */
export const MAX_LIMIT = 50;

type Failure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type ClientPageResult = { ok: true; page: Page<Client> } | Denied;
export type ClientResult = { ok: true; client: Client } | Denied | Failure;

const NOT_FOUND: Failure = {
  ok: false,
  status: 404,
  code: "NOT_FOUND",
  message: "Client not found.",
};

/** Clamp an arbitrary request value into `[1, MAX_LIMIT]`, defaulting when unusable. */
function clampLimit(requested: number): number {
  if (!Number.isFinite(requested)) {
    return DEFAULT_LIMIT;
  }

  const floored = Math.floor(requested);

  if (floored < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(floored, MAX_LIMIT);
}

/** Clamp an arbitrary request value into `[1, ∞)`, defaulting to the first page. */
function clampPage(requested: number): number {
  if (!Number.isFinite(requested)) {
    return 1;
  }

  return Math.max(1, Math.floor(requested));
}

/**
 * Returns one server-side page of clients for an allowed actor.
 *
 * The slice happens here so the response never carries the full array, and the
 * permission check runs before any data is read.
 */
export function listClients(
  actor: PublicUser,
  requestedPage: number,
  requestedLimit: number,
): ClientPageResult {
  const decision = authorize(actor, { type: ActionType.VIEW_CONTENT }, getUsers());

  if (!decision.ok) {
    return decision;
  }

  const page = clampPage(requestedPage);
  const limit = clampLimit(requestedLimit);
  const all = getClients();
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  return { ok: true, page: { items, page, limit, total: all.length } };
}

/** Returns a single client for an allowed actor, or 404 when it does not exist. */
export function getClientFor(actor: PublicUser, id: string): ClientResult {
  const decision = authorize(actor, { type: ActionType.VIEW_CONTENT }, getUsers());

  if (!decision.ok) {
    return decision;
  }

  const client = getClientById(id);

  if (!client) {
    return NOT_FOUND;
  }

  return { ok: true, client };
}
