import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "habit_session";

/**
 * Sends visitors without a session cookie to the login page before any page renders.
 * The API still validates the session itself; an expired cookie is handled by the client (401).
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except the public pages (login, about), the proxied API, Next internals and public files
  // (icons, manifest, images) that the login page itself needs.
  matcher: [
    "/((?!login|about|api|_next/static|_next/image|manifest\\.webmanifest|.*\\.(?:svg|png|ico|jpg|webp)$).*)",
  ],
};
