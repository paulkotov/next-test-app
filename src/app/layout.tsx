import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { navigationFor } from "@/domain/authz";
import { readSessionUser } from "@/server/current-user";
import { UserSessionControls } from "@/components/user-session-controls";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import "./globals.css";

/**
 * Runs synchronously while the browser parses the HTML — before first paint —
 * so the stored theme (or the OS preference, when none is stored) is applied
 * before any content shows, avoiding a flash. `<html>` carries
 * `suppressHydrationWarning` because this changes its class before React
 * hydrates. See node_modules/next/dist/docs/.../preventing-flash-before-hydration.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

// Every page depends on the live session, role and status, and deactivation
// must take effect on the very next request, so nothing here can be cached into
// a static shell. Blocking on the server (request-time render) is intentional.
export const instant = false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "User & Client Management",
  description: "Role-based directory of users and clients.",
};

/** Session-dependent header: the signed-in user's name, role-derived nav, logout. */
async function AppHeader() {
  const user = await readSessionUser();

  if (!user) {
    return null;
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-black/[.08] bg-white px-6 py-3 dark:border-white/[.145] dark:bg-zinc-950">
      <nav className="flex items-center gap-5 text-sm font-medium">
        {navigationFor(user).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserSessionControls userName={user.fullName} />
      </div>
    </header>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
