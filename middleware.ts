import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const rawSecret = process.env.JWT_SECRET
if (!rawSecret) throw new Error("JWT_SECRET environment variable is not set")
const JWT_SECRET = new TextEncoder().encode(rawSecret)

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/send-otp", "/api/auth/verify-otp"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get("backend_token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    // Ensure user has admin role
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  } catch {
    // Token expired or invalid — try refresh
    const refreshToken = request.cookies.get("backend_refresh_token")?.value
    if (!refreshToken) {
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("backend_token")
      return response
    }
    // Let the page load — backendFetch will handle refresh on API calls
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
