"use client";

import { useCallback, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Password field with a show/hide eye toggle. The input stays **uncontrolled**:
 * the button flips only its `type` attribute, so the value is never lifted into
 * React state (the login form still reads it straight from `FormData`, and the
 * password never lives in memory as component state). Only this leaf re-renders
 * when the eye is toggled.
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => setVisible((previous) => !previous), []);

  const label = visible ? "Hide password" : "Show password";

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={`${className ?? ""} w-full pr-10!`}
        {...props}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-zinc-500 transition-colors hover:text-black focus-visible:text-blue-500 focus-visible:outline-none dark:hover:text-zinc-200"
      >
        {visible ? (
          <EyeOffIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

type IconProps = { className?: string };

function EyeIcon({ className }: IconProps) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: IconProps) {
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
