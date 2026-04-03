import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { CHAT_URL } from "@/lib/api"

// POST /api/tickets/[id]/messages → POST /api/chat/admin/tickets/{id}/messages
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const backendToken = request.cookies.get("backend_token")?.value
  const body = await request.json()

  try {
    const res = await fetch(`${CHAT_URL}/admin/tickets/${id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Connection error" }, { status: 502 })
  }
}
