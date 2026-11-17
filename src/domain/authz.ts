import { toPublicUser, type PublicUser, type User } from "./user";

export enum Role {
  IT = "IT",
  MANAGER = "MANAGER",
  USER = "USER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  DEACTIVATED = "DEACTIVATED",
}

export enum ActionType {
  LIST_USERS = "LIST_USERS",
  CREATE_USER = "CREATE_USER",
  UPDATE_PROFILE = "UPDATE_PROFILE",
  CHANGE_ROLE = "CHANGE_ROLE",
  CHANGE_STATUS = "CHANGE_STATUS",
  VIEW_CONTENT = "VIEW_CONTENT",
}

export type Action =
  | { type: ActionType.LIST_USERS }
  | { type: ActionType.CREATE_USER }
  | { type: ActionType.UPDATE_PROFILE; target: User }
  | { type: ActionType.CHANGE_ROLE; target: User; nextRole: Role }
  | { type: ActionType.CHANGE_STATUS; target: User; nextStatus: UserStatus }
  | { type: ActionType.VIEW_CONTENT };

export const Denial = {
  FORBIDDEN: {
    code: "FORBIDDEN",
    message: "You cannot do that.",
  },
  OWN_ACCOUNT: {
    code: "OWN_ACCOUNT",
    message: "You cannot change your own role or status.",
  },
  LAST_ACTIVE_IT: {
    code: "LAST_ACTIVE_IT",
    message: "The last active IT account cannot be removed.",
  },
} as const;

export type DenialReason = (typeof Denial)[keyof typeof Denial];
export type DenialCode = DenialReason["code"];

export type Authorized = { ok: true };
export type Denied = {
  ok: false;
  status: 403;
  code: DenialCode;
  message: string;
};
export type AuthzResult = Authorized | Denied;

const ALLOWED: Authorized = { ok: true };

/**
 * Role-only actions (`LIST_USERS`, `VIEW_CONTENT`) never inspect the roster, so
 * navigation can authorize them without loading the user list from the store.
 */
const NO_ROSTER: readonly User[] = [];

function deny(reason: DenialReason): Denied {
  return {
    ok: false,
    status: 403,
    code: reason.code,
    message: reason.message,
  };
}

function allow(isAllowed: boolean): AuthzResult {
  return isAllowed ? ALLOWED : deny(Denial.FORBIDDEN);
}

function isActiveIt(person: User): boolean {
  return person.role === Role.IT && person.status === UserStatus.ACTIVE;
}

function otherActiveItExists(users: readonly User[], targetId: string): boolean {
  return users.some((person) => person.id !== targetId && isActiveIt(person));
}

function canUpdateProfile(actor: PublicUser, target: User): boolean {
  if (actor.role === Role.IT) {
    return true;
  }

  return (
    actor.role === Role.MANAGER &&
    target.id !== actor.id &&
    target.managerId === actor.id
  );
}

function authorizeAccountControl(
  actor: PublicUser,
  target: User,
  nextRole: Role,
  nextStatus: UserStatus,
  users: readonly User[],
): AuthzResult {
  if (actor.role !== Role.IT) {
    return deny(Denial.FORBIDDEN);
  }

  const removesActiveIt =
    isActiveIt(target) &&
    !(nextRole === Role.IT && nextStatus === UserStatus.ACTIVE);
  const isSelf = actor.id === target.id;
  const removesLastActiveIt =
    removesActiveIt && !otherActiveItExists(users, target.id);

  if (removesLastActiveIt && isSelf) {
    return deny(Denial.LAST_ACTIVE_IT);
  }

  if (
    isSelf &&
    (nextRole !== target.role || nextStatus === UserStatus.DEACTIVATED)
  ) {
    return deny(Denial.OWN_ACCOUNT);
  }

  if (removesLastActiveIt) {
    return deny(Denial.LAST_ACTIVE_IT);
  }

  return ALLOWED;
}

export function authorize(
  actor: PublicUser,
  action: Action,
  users: readonly User[],
): AuthzResult {
  switch (action.type) {
    case ActionType.CREATE_USER:
      return allow(actor.role === Role.IT);
    case ActionType.LIST_USERS:
      return allow(actor.role === Role.IT || actor.role === Role.MANAGER);
    case ActionType.VIEW_CONTENT:
      return allow(actor.role === Role.MANAGER || actor.role === Role.USER);
    case ActionType.UPDATE_PROFILE:
      return allow(canUpdateProfile(actor, action.target));
    case ActionType.CHANGE_ROLE:
      return authorizeAccountControl(
        actor,
        action.target,
        action.nextRole,
        action.target.status,
        users,
      );
    case ActionType.CHANGE_STATUS:
      return authorizeAccountControl(
        actor,
        action.target,
        action.target.role,
        action.nextStatus,
        users,
      );
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

export function listVisibleUsers(
  actor: PublicUser,
  users: readonly User[],
): { ok: true; users: PublicUser[] } | Denied {
  const decision = authorize(actor, { type: ActionType.LIST_USERS }, users);

  if (!decision.ok) {
    return decision;
  }

  const visible =
    actor.role === Role.IT
      ? users
      : users.filter((person) => person.managerId === actor.id);

  return { ok: true, users: visible.map(toPublicUser) };
}

export type NavLink = { href: string; label: string };

/**
 * Every navigable page paired with the permission that unlocks it. Links are
 * derived from `authorize`, never from `role === ...` checks in components, so a
 * new role only has to be taught here and in `authorize`.
 */
const NAV_LINKS: readonly (NavLink & { action: Action })[] = [
  { href: "/content", label: "Clients", action: { type: ActionType.VIEW_CONTENT } },
  { href: "/content/me", label: "My profile", action: { type: ActionType.VIEW_CONTENT } },
  { href: "/manage-users", label: "Team", action: { type: ActionType.LIST_USERS } },
];

/** Whether the actor may see the client content area (`/content/*`). */
export function canAccessContent(actor: PublicUser): boolean {
  return authorize(actor, { type: ActionType.VIEW_CONTENT }, NO_ROSTER).ok;
}

/** Whether the actor may see the user directory (`/manage-users`). */
export function canAccessUserDirectory(actor: PublicUser): boolean {
  return authorize(actor, { type: ActionType.LIST_USERS }, NO_ROSTER).ok;
}

/**
 * Whether the actor administers accounts: creating users and changing roles or
 * statuses. All of these are IT-only, so one capability covers the whole set.
 * The per-action rules (self, last active IT) are still enforced in `authorize`.
 */
export function canManageAccounts(actor: PublicUser): boolean {
  return authorize(actor, { type: ActionType.CREATE_USER }, NO_ROSTER).ok;
}

/** The links the shell may show this actor, decided by the same authorizer. */
export function navigationFor(actor: PublicUser): NavLink[] {
  return NAV_LINKS.filter(({ action }) => authorize(actor, action, NO_ROSTER).ok).map(
    ({ href, label }) => ({ href, label }),
  );
}

/** Where `/` and a fresh login send this actor, based on what they may see. */
export function landingPathFor(actor: PublicUser): string {
  if (canAccessContent(actor)) {
    return "/content";
  }

  if (canAccessUserDirectory(actor)) {
    return "/manage-users";
  }

  return "/login";
}
