import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { RIDES_URL } from "@/lib/api"

function getHeaders(request: NextRequest) {
  const backendToken = request.cookies.get("backend_token")?.value
  return {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
  }
}

// GET /api/rides-settings → GET /api/rides/admin/settings
export async function GET(request: NextRequest) {
  const token = request.cookies.get("backend_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const res = await fetch(`${RIDES_URL}/admin/settings`, { headers: getHeaders(request) })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Connection error" }, { status: 502 })
  }
}

// PUT /api/rides-settings → PUT /api/rides/admin/settings
export async function PUT(request: NextRequest) {
  const token = request.cookies.get("backend_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  try {
    const res = await fetch(`${RIDES_URL}/admin/settings`, {
      method: "PUT",
      headers: getHeaders(request),
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Connection error" }, { status: 502 })
  }
}
