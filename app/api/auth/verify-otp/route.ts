import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()
    if (!phone || !code) return NextResponse.json({ error: "Введите код" }, { status: 400 })

    const res = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ phone, code }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.detail?.[0]?.msg ?? "Неверный код" }, { status: res.status })
    }

    const accessToken: string = data.access_token ?? data.token ?? ""
    const refreshToken: string = data.refresh_token ?? ""

    if (!accessToken) {
      return NextResponse.json({ error: "Токен не получен" }, { status: 500 })
    }

    const response = NextResponse.json({ ok: true })

    response.cookies.set("backend_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    if (refreshToken) {
      response.cookies.set("backend_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
    }

    return response
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
