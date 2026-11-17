import Link from "next/link";
import { forbidden, notFound, redirect } from "next/navigation";

import { ClientStatus } from "@/domain/client";
import { getClientFor } from "@/server/clients";
import { readSessionUser } from "@/server/current-user";

// Depends on the `[id]` route param and the live session, so it blocks on the server.
export const instant = false;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-black/[.05] py-3 last:border-0 dark:border-white/[.08]">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-base text-black dark:text-zinc-50">{value}</dd>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: PageProps<"/content/client/[id]">) {
  const user = await readSessionUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const result = getClientFor(user, id);

  if (!result.ok) {
    // Permission is checked before existence, so IT gets 403 for any id.
    if (result.status === 404) {
      notFound();
    }
    forbidden();
  }

  const { client } = result;
  const createdOn = new Date(client.createdAt).toISOString().slice(0, 10);
  const status = client.status === ClientStatus.ACTIVE ? "Active" : "Churned";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <Link
        href="/content"
        className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
      >
        ← Back to clients
      </Link>

      <div className="mt-6 rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{client.name}</h1>
        <dl className="mt-4">
          <DetailRow label="Company" value={client.company} />
          <DetailRow label="Email" value={client.email} />
          <DetailRow label="Country" value={client.country} />
          <DetailRow label="Status" value={status} />
          <DetailRow label="Created" value={createdOn} />
        </dl>
      </div>
    </main>
  );
}
