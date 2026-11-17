"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { LogoutButton } from "@/components/ui/logout-button";

type UserSessionControlsProps = {
  userName: string;
};

/**
 * Client parent that owns the logout logic and feeds the pure `LogoutButton`.
 * `logout` is memoized so the button's props stay referentially stable.
 */
export function UserSessionControls({ userName }: UserSessionControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const logout = useCallback(() => {
    startTransition(async () => {
      await fetch("/api/session", { method: "DELETE" });
      router.replace("/login");
      router.refresh();
    });
  }, [router]);

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-zinc-500">{userName}</span>
      <LogoutButton onClick={logout} pending={pending} />
    </div>
  );
}
