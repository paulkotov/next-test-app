import { Role, UserStatus } from "@/domain/authz";
import type { CreateUserInput, UpdateUserPatch } from "@/server/users";

function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (Object.values(Role) as string[]).includes(value)
  );
}

function isStatus(value: unknown): value is UserStatus {
  return (
    typeof value === "string" &&
    (Object.values(UserStatus) as string[]).includes(value)
  );
}

function asRecord(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  return body as Record<string, unknown>;
}

export function parseCreateUserInput(body: unknown): CreateUserInput | null {
  const data = asRecord(body);

  if (!data) {
    return null;
  }

  const { fullName, email, password, role, status, managerId } = data;

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !isRole(role) ||
    !isStatus(status) ||
    !(managerId === null || typeof managerId === "string")
  ) {
    return null;
  }

  return { fullName, email, password, role, status, managerId };
}

export function parseUpdateUserPatch(body: unknown): UpdateUserPatch | null {
  const data = asRecord(body);

  if (!data) {
    return null;
  }

  const patch: UpdateUserPatch = {};

  if ("fullName" in data) {
    if (typeof data.fullName !== "string") {
      return null;
    }
    patch.fullName = data.fullName;
  }

  if ("email" in data) {
    if (typeof data.email !== "string") {
      return null;
    }
    patch.email = data.email;
  }

  if ("role" in data) {
    if (!isRole(data.role)) {
      return null;
    }
    patch.role = data.role;
  }

  if ("status" in data) {
    if (!isStatus(data.status)) {
      return null;
    }
    patch.status = data.status;
  }

  return patch;
}
