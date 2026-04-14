import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { RIDES_URL } from "@/lib/api"

// GET /api/rides/[id] → GET /api/rides/admin/rides/{id}
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get("backend_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const backendToken = request.cookies.get("backend_token")?.value

  try {
    const res = await fetch(`${RIDES_URL}/admin/rides/${id}`, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
      },
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Connection error" }, { status: 502 })
  }
}
