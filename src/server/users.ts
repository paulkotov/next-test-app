import {
  ActionType,
  Role,
  UserStatus,
  authorize,
  listVisibleUsers,
  type Action,
  type Denied,
} from "@/domain/authz";
import { toPublicUser, type PublicUser, type User } from "@/domain/user";
import {
  getUserByEmail,
  getUserById,
  getUsers,
  insertUser,
  updateUser,
} from "@/server/store";

export type CreateUserInput = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  status: UserStatus;
  managerId: string | null;
};

export type UpdateUserPatch = {
  fullName?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
};

type Failure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type UserResult = { ok: true; user: PublicUser } | Failure;
export type UserListResult = { ok: true; user: PublicUser[] } | Denied;

const NOT_FOUND: Failure = {
  ok: false,
  status: 404,
  code: "NOT_FOUND",
  message: "User not found.",
};

const EMAIL_TAKEN: Failure = {
  ok: false,
  status: 409,
  code: "EMAIL_TAKEN",
  message: "Email is already used.",
};

export function listUsersFor(actor: PublicUser): UserListResult {
  const result = listVisibleUsers(actor, getUsers());

  if (!result.ok) {
    return result;
  }

  return { ok: true, user: result.users };
}

function emailTaken(email: string, exceptId?: string): boolean {
  const existing = getUserByEmail(email);
  return existing !== undefined && existing.id !== exceptId;
}

export function createUser(actor: PublicUser, input: CreateUserInput): UserResult {
  const decision = authorize(actor, { type: ActionType.CREATE_USER }, getUsers());

  if (!decision.ok) {
    return decision;
  }

  if (emailTaken(input.email)) {
    return EMAIL_TAKEN;
  }

  const user: User = {
    id: `user_${crypto.randomUUID()}`,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    status: input.status,
    managerId: input.managerId,
    password: input.password,
    createdAt: new Date().toISOString(),
  };

  insertUser(user);
  return { ok: true, user: toPublicUser(user) };
}

export function updateUserAccount(
  actor: PublicUser,
  targetId: string,
  patch: UpdateUserPatch,
): UserResult {
  const target = getUserById(targetId);

  if (!target) {
    return NOT_FOUND;
  }

  const actions: Action[] = [];

  if (patch.fullName !== undefined || patch.email !== undefined) {
    actions.push({ type: ActionType.UPDATE_PROFILE, target });
  }

  if (patch.role !== undefined) {
    actions.push({
      type: ActionType.CHANGE_ROLE,
      target,
      nextRole: patch.role,
    });
  }

  if (patch.status !== undefined) {
    actions.push({
      type: ActionType.CHANGE_STATUS,
      target,
      nextStatus: patch.status,
    });
  }

  // Every applicable permission must pass before any write happens.
  for (const action of actions) {
    const decision = authorize(actor, action, getUsers());

    if (!decision.ok) {
      return decision;
    }
  }

  if (patch.email !== undefined && emailTaken(patch.email, target.id)) {
    return EMAIL_TAKEN;
  }

  const updated = updateUser(targetId, patch);

  // `updated` is defined because `target` was found above and no concurrent
  // removal is possible in this single-threaded in-memory store.
  return { ok: true, user: toPublicUser(updated ?? target) };
}
