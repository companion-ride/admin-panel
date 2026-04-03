import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { CHAT_URL } from "@/lib/api"

// GET /api/tickets → GET /api/chat/admin/tickets
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const backendToken = request.cookies.get("backend_token")?.value
  const { searchParams } = request.nextUrl
  const params = new URLSearchParams()
  if (searchParams.get("status")) params.set("status", searchParams.get("status")!)
  if (searchParams.get("search")) params.set("search", searchParams.get("search")!)
  if (searchParams.get("page")) params.set("page", searchParams.get("page")!)
  params.set("limit", searchParams.get("limit") ?? "20")

  try {
    const res = await fetch(`${CHAT_URL}/admin/tickets?${params}`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
      },
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ tickets: [], total: 0 }, { status: 502 })
  }
}
