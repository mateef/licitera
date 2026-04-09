import { NextRequest, NextResponse } from "next/server";

const PRELAUNCH_MODE = process.env.PRELAUNCH_MODE === "true";

export function middleware(req: NextRequest) {
  if (!PRELAUNCH_MODE) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  const publicPaths = [
    "/",
    "/api/prelaunch-login",
    "/api/prelaunch-logout",
    "/api/waitlist",
    "/api/waitlist-count",
    "/api/stripe/webhook",
    "/favicon.ico",
    "/api/stripe/customer-portal",
    "/api/stripe/change-subscription-plan",
    "/api/stripe/create-balance-topup-checkout",
    "/api/stripe/create-subscription-checkout",
    "/api/stripe/subscription-status",
    "/api/stripe",
    "/api/chat/post-sale/open",
    "/api/notifications/chat-message",
    "/api/notifications/buy-now",
    "/api/ai/image-listing",
    "/api/ai/category-suggest",
    "/api/ai/listing-suggest",
    "/delete-request",
    "/support/report-error",
    "/legal/aszf",
    "/legal/privacy",
  ];

  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i) !== null;

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};