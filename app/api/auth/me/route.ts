import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/api"

export async function GET(request: NextRequest) {
  const token = request.cookies.get("backend_token")?.value
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const res = await fetch(`${API_BASE_URL}/me/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await res.json()

    return NextResponse.json({
      id: profile.user_id,
      name: profile.name,
      phone: profile.phone,
      role: profile.roles?.includes("admin") ? "admin" : "user",
      roles: profile.roles,
    })
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 502 })
  }
}
