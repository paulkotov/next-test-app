"use client";

import { useCallback, useLayoutEffect } from "react";

const STORAGE_KEY = "theme";

/** The theme to show when the user has not chosen one yet: follow the OS. */
function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve the effective theme from the stored choice, falling back to the OS. */
function shouldBeDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return prefersDark();
}

/**
 * Light/dark switch. The visible icon is chosen purely by the `.dark` class on
 * <html> (Tailwind's class-based `dark:` variant), so flipping the theme only
 * mutates one class on the document — this component never re-renders, and both
 * icons are server-rendered so there is no hydration mismatch or flash.
 */
export function ThemeToggle() {
  // The inline script in the layout sets the class before paint, but React's
  // Strict Mode remount in development resets <html> to its JSX attributes and
  // drops it. Re-applying here keeps dev in sync; it is a no-op in production.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", shouldBeDark());
  }, []);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or disabled storage: the choice simply will not persist.
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Toggle theme"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[.12] text-zinc-600 transition-colors hover:bg-black/[.04] dark:border-white/[.18] dark:text-zinc-300 dark:hover:bg-white/[.06]"
    >
      <SunIcon className="hidden h-4 w-4 dark:block" />
      <MoonIcon className="block h-4 w-4 dark:hidden" />
    </button>
  );
}

type IconProps = { className?: string };

function SunIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
