import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    if (!phone) return NextResponse.json({ error: "Введите номер телефона" }, { status: 400 })

    const res = await fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ phone }),
    })

    const text = await res.text()

    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      // Показываем первые 200 символов реального ответа для диагностики
      return NextResponse.json(
        { error: `Ответ сервера (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 }
      )
    }

    if (!res.ok) {
      const detail = data?.detail
      const msg = (Array.isArray(detail) ? (detail[0] as Record<string, unknown>)?.msg : detail) ?? data?.error ?? `Ошибка ${res.status}`
      return NextResponse.json({ error: String(msg) }, { status: res.status })
    }

    return NextResponse.json({ ok: true, phone: (data.phone as string) ?? phone })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Ошибка сервера: ${msg}` }, { status: 500 })
  }
}
