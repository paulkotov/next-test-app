type LogoutButtonProps = {
  onClick: () => void;
  pending: boolean;
};

/** Pure presentational button. All logout logic lives in the parent. */
export function LogoutButton({ onClick, pending }: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-full border border-black/[.12] px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.18] dark:text-zinc-300 dark:hover:bg-white/[.06]"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
