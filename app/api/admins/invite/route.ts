import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/api"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const canInvite = auth.role === "super" || auth.permissions?.inviteAdmins
  if (!canInvite) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { name, phone } = await request.json()
    if (!name || !phone) return NextResponse.json({ error: "Заполните все поля" }, { status: 400 })

    const backendToken = request.cookies.get("backend_token")?.value

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    }
    if (backendToken) headers["Authorization"] = `Bearer ${backendToken}`

    const res = await fetch(`${API_BASE_URL}/admin/invite`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, phone }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const msg = data?.detail?.[0]?.msg ?? data?.detail ?? data?.error ?? `Ошибка ${res.status}`
      return NextResponse.json({ error: String(msg) }, { status: res.status })
    }

    return NextResponse.json({ ok: true, message: data?.message, phone: data?.phone })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Неизвестная ошибка"
    return NextResponse.json({ error: `Ошибка сервера: ${msg}` }, { status: 500 })
  }
}
