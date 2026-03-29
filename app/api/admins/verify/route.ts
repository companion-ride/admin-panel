import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/api"
import { verifyToken } from "@/lib/auth"

// POST /api/admins/verify → POST /verify (verify OTP for invited admin)
export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { phone, code } = await request.json()
    if (!phone || !code) return NextResponse.json({ error: "Phone and code required" }, { status: 400 })

    const backendToken = request.cookies.get("backend_token")?.value

    const res = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
      },
      body: JSON.stringify({ phone, code }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const detail = data?.detail
      const msg = Array.isArray(detail) ? (detail[0] as Record<string, unknown>)?.msg : detail
      return NextResponse.json({ error: String(msg ?? data?.error ?? "Verification failed") }, { status: res.status })
    }

    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
