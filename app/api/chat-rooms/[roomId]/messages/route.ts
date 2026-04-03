import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { CHAT_URL } from "@/lib/api"

// GET /api/chat-rooms/[roomId]/messages → GET /api/chat/chat/rooms/{roomId}/messages
export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { roomId } = await params
  const backendToken = request.cookies.get("backend_token")?.value
  const { searchParams } = request.nextUrl
  const query = new URLSearchParams()
  if (searchParams.get("cursor")) query.set("cursor", searchParams.get("cursor")!)
  query.set("limit", searchParams.get("limit") ?? "50")

  try {
    const res = await fetch(`${CHAT_URL}/chat/rooms/${roomId}/messages?${query}`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
      },
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ messages: [], next_cursor: null }, { status: 502 })
  }
}
