"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Role, UserStatus } from "@/domain/authz";
import type { PublicUser } from "@/domain/user";

type ManagerOption = { id: string; fullName: string };

const ROLES = Object.values(Role);
const STATUSES = Object.values(UserStatus);

const inputClass =
  "rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-blue-500 dark:border-white/[.18] dark:text-zinc-50";
const buttonClass =
  "inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]";

/** Reads `{ error: { message } }` from a failed API response. */
async function readErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message = (body as { error?: { message?: string } } | null)?.error?.message;
  return message ?? "Something went wrong.";
}

function StatusTag({ status }: { status: UserStatus }) {
  const isActive = status === UserStatus.ACTIVE;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {isActive ? "Active" : "Deactivated"}
    </span>
  );
}

function UserRow({
  row,
  canManageAccounts,
}: {
  row: PublicUser;
  canManageAccounts: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    // Send only what actually changed, so editing a name never trips the
    // role/status permission checks.
    const patch: Record<string, string> = {};
    const fullName = String(data.get("fullName") ?? "");
    const email = String(data.get("email") ?? "");

    if (fullName !== row.fullName) patch.fullName = fullName;
    if (email !== row.email) patch.email = email;

    if (canManageAccounts) {
      const role = String(data.get("role") ?? "");
      const status = String(data.get("status") ?? "");
      if (role !== row.role) patch.role = role;
      if (status !== row.status) patch.status = status;
    }

    if (Object.keys(patch).length === 0) {
      setError(null);
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/users/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response));
        return;
      }

      setError(null);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 border-b border-black/[.05] px-4 py-4 last:border-0 dark:border-white/[.08] md:flex-row md:items-center"
    >
      <input
        name="fullName"
        aria-label="Full name"
        defaultValue={row.fullName}
        required
        className={`${inputClass} md:w-48`}
      />
      <input
        name="email"
        type="email"
        aria-label="Email"
        defaultValue={row.email}
        required
        className={`${inputClass} md:flex-1`}
      />

      {canManageAccounts ? (
        <>
          <select name="role" aria-label="Role" defaultValue={row.role} className={inputClass}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            name="status"
            aria-label="Status"
            defaultValue={row.status}
            className={inputClass}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </>
      ) : (
        <StatusTag status={row.status} />
      )}

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Save"}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 md:ml-2">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function CreateUserForm({ managerOptions }: { managerOptions: ManagerOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const managerId = String(data.get("managerId") ?? "");

    const payload = {
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      role: String(data.get("role") ?? ""),
      status: String(data.get("status") ?? ""),
      managerId: managerId === "" ? null : managerId,
    };

    startTransition(async () => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response));
        return;
      }

      setError(null);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
    >
      <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Create user</h2>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input name="fullName" aria-label="Full name" placeholder="Full name" required className={inputClass} />
        <input name="email" type="email" aria-label="Email" placeholder="Email" required className={inputClass} />
        <input
          name="password"
          type="password"
          aria-label="Password"
          placeholder="Password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <select name="managerId" aria-label="Manager" defaultValue="" className={inputClass}>
          <option value="">No manager</option>
          {managerOptions.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.fullName}
            </option>
          ))}
        </select>
        <select name="role" aria-label="Role" defaultValue={Role.USER} className={inputClass}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select name="status" aria-label="Status" defaultValue={UserStatus.ACTIVE} className={inputClass}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={pending} className={`${buttonClass} mt-4`}>
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}

export function UserManager({
  rows,
  canManageAccounts,
  managerOptions,
}: {
  rows: PublicUser[];
  canManageAccounts: boolean;
  managerOptions: ManagerOption[];
}) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      {canManageAccounts ? <CreateUserForm managerOptions={managerOptions} /> : null}

      <div className="overflow-hidden rounded-xl border border-black/[.08] dark:border-white/[.145]">
        {rows.map((row) => (
          // Keyed by the persisted values so a refresh remounts the row with
          // fresh defaults instead of keeping stale input values.
          <UserRow
            key={`${row.id}:${row.fullName}:${row.email}:${row.role}:${row.status}`}
            row={row}
            canManageAccounts={canManageAccounts}
          />
        ))}
      </div>
    </div>
  );
}
