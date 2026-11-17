"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { landingPathFor } from "@/domain/authz";
import type { PublicUser } from "@/domain/user";

const GENERIC_ERROR = "Email or password is wrong, or the account is deactivated.";

type LoginState = { error: string | null; redirectTo: string | null };

const INITIAL_STATE: LoginState = { error: null, redirectTo: null };

/**
 * Posts the credentials and returns where to go next. Inputs stay uncontrolled
 * and are read from `FormData`, so the password never lives in React state.
 */
async function submitLogin(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = (body as { error?: { message?: string } } | null)?.error?.message;
    return { error: message ?? GENERIC_ERROR, redirectTo: null };
  }

  const body = (await response.json()) as { user: PublicUser };
  return { error: null, redirectTo: landingPathFor(body.user) };
}

export default function LoginPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState(submitLogin, INITIAL_STATE);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state.redirectTo, router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Sign in
        </h1>

        {state.error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {state.error}
          </p>
        ) : null}

        <form action={action} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              className="rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-base text-black outline-none focus:border-blue-500 dark:border-white/[.18] dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-base text-black outline-none focus:border-blue-500 dark:border-white/[.18] dark:text-zinc-50"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
