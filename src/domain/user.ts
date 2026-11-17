import type { Role, UserStatus } from "./authz";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  managerId: string | null;
  password: string;
  createdAt: string;
};

export type PublicUser = Omit<User, "password">;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    managerId: user.managerId,
    createdAt: user.createdAt,
  };
}
