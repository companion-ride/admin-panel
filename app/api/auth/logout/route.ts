import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/api"

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("backend_refresh_token")?.value

  // Revoke refresh token on the backend
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Best-effort — still clear cookies even if backend is unreachable
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete("backend_token")
  response.cookies.delete("backend_refresh_token")
  return response
}
