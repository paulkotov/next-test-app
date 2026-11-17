import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/config";

/**
 * Edge-of-app gate. It only looks at whether a session cookie is present — it
 * never reads the store and never decides anything about roles. That keeps a
 * single source of truth in `authorize`/the use-case layer: a cookie that
 * belongs to a now-deactivated user still passes here and is rejected later,
 * when the page or route re-reads the live user.
 *
 * Anonymous visitors are redirected to `/login`, except for the login page
 * itself and the login request (`POST /api/session`).
 */
export function proxy(request: NextRequest): NextResponse {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isLoginRequest = pathname === "/api/session" && request.method === "POST";

  if (isLoginPage || isLoginRequest) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Run on every path except static assets and image/metadata files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
