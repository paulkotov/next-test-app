"use client";

import { useRouter } from "next/navigation";
import { memo, useState, useTransition, type FormEvent } from "react";

import { Role, UserStatus } from "@/domain/authz";
import type { PublicUser } from "@/domain/user";
import { PasswordInput } from "@/components/ui/password-input";

type ManagerOption = { id: string; fullName: string };

const ROLES = Object.values(Role);
const STATUSES = Object.values(UserStatus);

/** Sends JSON to the API and returns either success or the server's message. */
async function sendJson(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return { ok: true };
  }

  const data: unknown = await response.json().catch(() => null);
  const message = (data as { error?: { message?: string } } | null)?.error?.message;
  return { ok: false, message: message ?? "Something went wrong." };
}

function FieldError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

const inputClass =
  "rounded-lg border border-black/[.12] bg-transparent px-3 py-1.5 text-sm text-black outline-none focus:border-blue-500 dark:border-white/[.18] dark:text-zinc-50";

const primaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]";

export function UserManager({
  users,
  currentUserId,
  canManageAccounts,
  managerOptions,
}: {
  users: PublicUser[];
  currentUserId: string;
  canManageAccounts: boolean;
  managerOptions: ManagerOption[];
}) {
  return (
    <div className="mt-6 flex flex-col gap-8">
      {canManageAccounts ? <CreateUserForm managerOptions={managerOptions} /> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {users.length} {users.length === 1 ? "person" : "people"}
        </h2>

        <ul className="flex flex-col gap-3">
          {users.map((person) => (
            <UserRow
              key={person.id}
              user={person}
              isSelf={person.id === currentUserId}
              canManageAccounts={canManageAccounts}
            />
          ))}
        </ul>
      </section>
    </div>
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

    const body = {
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      role: String(data.get("role") ?? ""),
      status: String(data.get("status") ?? ""),
      managerId: managerId === "" ? null : managerId,
    };

    setError(null);
    startTransition(async () => {
      const result = await sendJson("/api/users", "POST", body);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Create user
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="fullName" placeholder="Full name" required className={inputClass} />
        <input
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="off"
          required
          className={inputClass}
        />
        <PasswordInput
          name="password"
          placeholder="Password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <select name="managerId" defaultValue="" className={inputClass}>
          <option value="">No manager</option>
          {managerOptions.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.fullName}
            </option>
          ))}
        </select>
        <select name="role" defaultValue={Role.USER} className={inputClass}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={UserStatus.ACTIVE} className={inputClass}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <FieldError message={error} />

      <div>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Creating…" : "Create user"}
        </button>
      </div>
    </form>
  );
}

const UserRow = memo(function UserRow({
  user,
  isSelf,
  canManageAccounts,
}: {
  user: PublicUser;
  isSelf: boolean;
  canManageAccounts: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isActive = user.status === UserStatus.ACTIVE;
  const profileDirty = fullName !== user.fullName || email !== user.email;

  function patch(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const result = await sendJson(`/api/users/${user.id}`, "PATCH", body);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      // Re-read the store so the row reflects the real, server-side state.
      router.refresh();
    });
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    patch({ fullName, email });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-black dark:text-zinc-50">{user.role}</span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {isActive ? "Active" : "Deactivated"}
          </span>
          {isSelf ? <span className="text-xs text-zinc-400">(you)</span> : null}
        </div>
      </div>

      <form onSubmit={saveProfile} className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          className={`${inputClass} flex-1`}
        />
        <input
          aria-label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={pending || !profileDirty}
          className={primaryButtonClass}
        >
          Save
        </button>
      </form>

      {canManageAccounts ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Role"
            key={user.role}
            defaultValue={user.role}
            disabled={pending}
            onChange={(event) => patch({ role: event.target.value })}
            className={inputClass}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              patch({
                status: isActive ? UserStatus.DEACTIVATED : UserStatus.ACTIVE,
              })
            }
            className="inline-flex h-9 items-center justify-center rounded-full border border-black/[.12] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.18] dark:hover:bg-white/[.06]"
          >
            {isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      ) : null}

      <FieldError message={error} />
    </li>
  );
});
