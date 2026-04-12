import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/api"

// POST /api/auth/refresh — uses backend_refresh_token to get a new access + refresh token pair
export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get("admin_token")?.value
  if (!adminToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(adminToken)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const refreshToken = request.cookies.get("backend_refresh_token")?.value
  if (!refreshToken) return NextResponse.json({ error: "No refresh token" }, { status: 401 })

  try {
    const res = await fetch(`${API_BASE_URL}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      // Refresh token is expired or revoked — clear cookies
      const errResp = NextResponse.json({ error: "Refresh failed" }, { status: 401 })
      errResp.cookies.delete("backend_token")
      errResp.cookies.delete("backend_refresh_token")
      return errResp
    }

    const data = await res.json()
    const response = NextResponse.json({ ok: true })

    response.cookies.set("backend_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    response.cookies.set("backend_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return response
  } catch {
    return NextResponse.json({ error: "Connection error" }, { status: 502 })
  }
}
