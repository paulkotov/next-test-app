import { forbidden, redirect } from "next/navigation";

import { Role, UserStatus, canManageAccounts } from "@/domain/authz";
import { readSessionUser } from "@/server/current-user";
import { listUsersFor } from "@/server/users";
import { UserManager } from "./user-forms";

// Depends on the live session and user roster, so it blocks on the server.
export const instant = false;

export default async function ManageUsersPage() {
  const user = await readSessionUser();

  if (!user) {
    redirect("/login");
  }

  const result = listUsersFor(user);

  if (!result.ok) {
    forbidden();
  }

  const users = result.user;
  const manageAccounts = canManageAccounts(user);

  // Options for the "manager" field of the create form (admins only).
  const managerOptions = manageAccounts
    ? users
        .filter(
          (person) =>
            person.role === Role.MANAGER && person.status === UserStatus.ACTIVE,
        )
        .map((person) => ({ id: person.id, fullName: person.fullName }))
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Team</h1>

      <UserManager
        users={users}
        currentUserId={user.id}
        canManageAccounts={manageAccounts}
        managerOptions={managerOptions}
      />
    </main>
  );
}
