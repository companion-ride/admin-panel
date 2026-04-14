import { NextRequest, NextResponse } from "next/server"
import { BACKEND_URL } from "@/lib/api"
import { verifyToken } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get("backend_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const backendToken = request.cookies.get("backend_token")?.value
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  }
  if (backendToken) headers["Authorization"] = `Bearer ${backendToken}`

  try {
    const res = await fetch(`${BACKEND_URL}/admin/users/${id}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return NextResponse.json({ error: data?.detail ?? `Ошибка ${res.status}` }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Ошибка сервера: ${msg}` }, { status: 500 })
  }
}
