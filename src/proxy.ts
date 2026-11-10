import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLegacyCampusPage, legacyCampusHref } from "@/lib/legacyCampus";

// When set, the operator space only answers on this host and the public portal hides it.
const PRIVATE_HOST = process.env.PRIVATE_HOST;
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://backend:3000";

// Retired apartments and Foyer pages: a real redirect to the matching campus map selection.
async function campusRedirect(request: NextRequest, token: string) {
  const href = await legacyCampusHref(request.nextUrl.pathname, request.nextUrl.searchParams, async query => {
    const response = await fetch(`${INTERNAL_API_URL}/private/maps/indoor/legacy?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return response.ok ? response.json() : null;
  });
  const target = request.nextUrl.clone();
  const [pathname, search] = href.split("?");
  target.pathname = pathname;
  target.search = search ? `?${search}` : "";
  return NextResponse.redirect(target);
}

export async function proxy(request: NextRequest) {
  const response = await route(request);
  if (PRIVATE_HOST && request.headers.get("host") === PRIVATE_HOST) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

async function route(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Protect any route under /palantint (operator space)
  const isPrivateKey = pathname === "/palantint" || pathname.startsWith("/palantint/");

  if (PRIVATE_HOST) {
    const onPrivateHost = request.headers.get("host") === PRIVATE_HOST;
    if (!onPrivateHost && (isPrivateKey || pathname === "/login")) {
      return NextResponse.redirect(`https://${PRIVATE_HOST}${pathname}${search}`);
    }
    if (onPrivateHost && pathname === "/") {
      return NextResponse.redirect(`https://${PRIVATE_HOST}/palantint`);
    }
  }

  if (isPrivateKey) {
    const token = request.cookies.get("palantint_token")?.value;
    if (!token) {
      const refreshToken = request.cookies.get("palantint_refresh_token")?.value;
      if (refreshToken) {
        try {
          // Use internal docker DNS when running inside docker-compose, fallback to request origin
          const backendUrl = "http://backend:3000/auth/refresh";

          const refreshRes = await fetch(backendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data.access_token && data.refresh_token) {
              const response = isLegacyCampusPage(pathname) ? await campusRedirect(request, data.access_token) : NextResponse.next();
              response.cookies.set("palantint_token", data.access_token, {
                path: "/",
                maxAge: 300, // 5 minutes
                sameSite: "lax",
              });
              response.cookies.set("palantint_refresh_token", data.refresh_token, {
                path: "/",
                maxAge: 3600, // 1 hour
                sameSite: "lax",
              });
              return response;
            }
          }
        } catch (err) {
          console.error("Middleware token refresh failed:", err);
        }
      }

      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("palantint_token");
      response.cookies.delete("palantint_refresh_token");
      return response;
    }
    if (isLegacyCampusPage(pathname)) return campusRedirect(request, token);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.).*)",
  ],
};
