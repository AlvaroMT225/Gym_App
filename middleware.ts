import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session"

const PUBLIC_ROUTES = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow API auth routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next()
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  // If user is logged in and visits login/register, redirect to dashboard
  if (isPublicRoute) {
    if (token) {
      const session = await verifySessionToken(token)
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const session = await verifySessionToken(token)
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
