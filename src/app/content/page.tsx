import Link from "next/link";
import { forbidden, redirect } from "next/navigation";

import { ClientStatus } from "@/domain/client";
import { DEFAULT_LIMIT, listClients } from "@/server/clients";
import { readSessionUser } from "@/server/current-user";

// This route depends on the `?page=` URL and the live session/role, neither of
// which can be cached or prefetched, so it blocks on the server by design.
export const instant = false;

const COLUMNS = "grid-cols-[1.4fr_1.4fr_2fr_1fr_0.8fr]";

// Fixed locale so the server and client render the same string (no hydration drift).
const numberFormat = new Intl.NumberFormat("en-US");

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function StatusTag({ status }: { status: ClientStatus }) {
  const isActive = status === ClientStatus.ACTIVE;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {isActive ? "Active" : "Churned"}
    </span>
  );
}

export default async function ContentPage({ searchParams }: PageProps<"/content">) {
  const user = await readSessionUser();

  if (!user) {
    redirect("/login");
  }

  const { page } = await searchParams;
  const result = listClients(user, Number(firstParam(page)), DEFAULT_LIMIT);

  // IT may not browse clients; `listClients` denies it and we render 403 UI.
  if (!result.ok) {
    forbidden();
  }

  const { items, page: current, limit, total } = result.page;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrevious = current > 1;
  const hasNext = current * limit < total;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Clients</h1>
        <p className="text-sm text-zinc-500">{numberFormat.format(total)} total</p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/[.08] dark:border-white/[.145]">
        <div className="min-w-3xl">
          <div
            className={`grid ${COLUMNS} gap-4 border-b border-black/[.08] bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-white/[.145] dark:bg-zinc-900`}
          >
            <span>Name</span>
            <span>Company</span>
            <span>Email</span>
            <span>Country</span>
            <span>Status</span>
          </div>

          {items.map((client) => (
            <Link
              key={client.id}
              href={`/content/client/${client.id}`}
              className={`grid ${COLUMNS} items-center gap-4 border-b border-black/[.05] px-4 py-3 text-sm transition-colors last:border-0 hover:bg-black/[.03] dark:border-white/[.08] dark:hover:bg-white/[.04]`}
            >
              <span className="font-medium text-black dark:text-zinc-50">{client.name}</span>
              <span className="text-zinc-600 dark:text-zinc-400">{client.company}</span>
              <span className="truncate text-zinc-600 dark:text-zinc-400">{client.email}</span>
              <span className="text-zinc-600 dark:text-zinc-400">{client.country}</span>
              <StatusTag status={client.status} />
            </Link>
          ))}
        </div>
      </div>

      <nav className="mt-6 flex items-center justify-between text-sm">
        {hasPrevious ? (
          <Link
            href={`/content?page=${current - 1}`}
            className="rounded-full border border-black/[.12] px-4 py-2 font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.06]"
          >
            ← Previous
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-4 py-2 font-medium text-zinc-400">
            ← Previous
          </span>
        )}

        <span className="text-zinc-500">
          Page {current} of {totalPages}
        </span>

        {hasNext ? (
          <Link
            href={`/content?page=${current + 1}`}
            className="rounded-full border border-black/[.12] px-4 py-2 font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.06]"
          >
            Next →
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-4 py-2 font-medium text-zinc-400">
            Next →
          </span>
        )}
      </nav>
    </main>
  );
}
