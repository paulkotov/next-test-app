import { forbidden, redirect } from "next/navigation";

import { Role, canAccessUserDirectory, canManageAccounts } from "@/domain/authz";
import { readSessionUser } from "@/server/current-user";
import { listUsersFor } from "@/server/users";
import { UserManager } from "./user-forms";

// Depends on the live session and roster, so it blocks on the server.
export const instant = false;

export default async function ManageUsersPage() {
  const user = await readSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Plain users have no directory; managers and IT do.
  if (!canAccessUserDirectory(user)) {
    forbidden();
  }

  // The server decides which users are visible (IT: everyone, manager: own
  // reports). The client never filters the roster itself.
  const result = listUsersFor(user);

  if (!result.ok) {
    forbidden();
  }

  const rows = result.user;
  const manageable = canManageAccounts(user);
  const managerOptions = manageable
    ? rows
        .filter((person) => person.role === Role.MANAGER)
        .map((person) => ({ id: person.id, fullName: person.fullName }))
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Team</h1>
        <p className="text-sm text-zinc-500">{rows.length} shown</p>
      </div>

      <UserManager
        rows={rows}
        canManageAccounts={manageable}
        managerOptions={managerOptions}
      />
    </main>
  );
}
