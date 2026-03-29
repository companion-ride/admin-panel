import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { BACKEND_URL } from "@/lib/api"

// GET /api/dashboard/stats → GET /admin/stats
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const backendToken = request.cookies.get("backend_token")?.value

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  }
  if (backendToken) headers["Authorization"] = `Bearer ${backendToken}`

  try {
    const usersRes = await fetch(`${BACKEND_URL}/admin/users?status=active&limit=1`, { headers })
    const usersData = await usersRes.json().catch(() => null)

    return NextResponse.json({
      active_users: usersData?.total ?? 0,
    })
  } catch {
    return NextResponse.json(null, { status: 502 })
  }
}
