import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect any route under /palantint (operator space)
  const isPrivateKey = pathname === "/palantint" || pathname.startsWith("/palantint/");

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
              const response = NextResponse.next();
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.).*)",
  ],
};
