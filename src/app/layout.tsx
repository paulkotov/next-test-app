import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { navigationFor } from "@/domain/authz";
import { readSessionUser } from "@/server/current-user";
import { UserSessionControls } from "@/components/user-session-controls";
import "./globals.css";

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
        <span className="font-semibold text-black dark:text-zinc-50">Directory</span>
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
      <UserSessionControls userName={user.fullName} />
    </header>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
