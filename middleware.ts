import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Publikus oldalak
  const publicPaths = [
    "/",
    "/api/prelaunch-login",
    "/api/prelaunch-logout",
    "/api/waitlist",
    "/favicon.ico",
  ];

  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/) !== null;

  if (isPublic) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("licitera_prelaunch_auth")?.value;

  if (authCookie === "ok") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};