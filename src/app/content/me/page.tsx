import { forbidden, redirect } from "next/navigation";

import { canAccessContent } from "@/domain/authz";
import { readSessionUser } from "@/server/current-user";

// Depends on the live session, so it blocks on the server rather than prerendering.
export const instant = false;

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-black/[.05] py-3 last:border-0 dark:border-white/[.08]">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-base text-black dark:text-zinc-50">{value}</dd>
    </div>
  );
}

export default async function MyProfilePage() {
  const user = await readSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Same content gate as the rest of /content: IT has no profile page here.
  if (!canAccessContent(user)) {
    forbidden();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">My profile</h1>

      <div className="mt-6 rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
        <dl>
          <ProfileRow label="Name" value={user.fullName} />
          <ProfileRow label="Email" value={user.email} />
          <ProfileRow label="Role" value={user.role} />
          <ProfileRow label="Status" value={user.status} />
        </dl>
      </div>
    </main>
  );
}
