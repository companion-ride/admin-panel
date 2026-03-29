import { NextRequest, NextResponse } from "next/server"
import { BACKEND_URL } from "@/lib/api"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const params = new URLSearchParams()
  if (searchParams.get("role")) params.set("role", searchParams.get("role")!)
  if (searchParams.get("search")) params.set("search", searchParams.get("search")!)
  if (searchParams.get("page")) params.set("page", searchParams.get("page")!)
  params.set("limit", searchParams.get("limit") ?? "100")

  const backendToken = request.cookies.get("backend_token")?.value
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  }
  if (backendToken) headers["Authorization"] = `Bearer ${backendToken}`

  try {
    const res = await fetch(`${BACKEND_URL}/admin/users?${params}`, { headers })
    const text = await res.text()

    let data
    try { data = JSON.parse(text) } catch {
      return NextResponse.json({ error: `Ответ сервера (${res.status}): ${text.slice(0, 200)}` }, { status: 502 })
    }

    if (!res.ok) {
      return NextResponse.json({ error: data?.detail ?? `Ошибка ${res.status}` }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Ошибка сервера: ${msg}` }, { status: 500 })
  }
}
