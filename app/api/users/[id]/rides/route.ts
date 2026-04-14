import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { BACKEND_URL } from "@/lib/api"

// GET /api/users/[id]/rides → GET /admin/users/{user_id}/rides
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get("backend_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const backendToken = request.cookies.get("backend_token")?.value
  const { searchParams } = request.nextUrl
  const query = new URLSearchParams()
  if (searchParams.get("page")) query.set("page", searchParams.get("page")!)
  if (searchParams.get("limit")) query.set("limit", searchParams.get("limit")!)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  }
  if (backendToken) headers["Authorization"] = `Bearer ${backendToken}`

  try {
    const res = await fetch(`${BACKEND_URL}/admin/users/${id}/rides?${query}`, { headers })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ items: [], total: 0, page: 1, limit: 20 }, { status: 502 })
  }
}
