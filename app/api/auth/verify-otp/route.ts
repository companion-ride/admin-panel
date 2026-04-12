import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/api"
import { signToken } from "@/lib/auth"
import { findAdminByPhone, getAdmins } from "@/lib/admins"

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

    // Бэкенд может вернуть token и/или данные admin-а
    const backendToken: string = data.access_token ?? data.token ?? ""
    const adminData = data.admin ?? data.user ?? {}

    // Ищем админа в локальной базе: сначала по полю phone, потом по login
    const localAdmin =
      await findAdminByPhone(phone) ??
      await findAdminByPhone(String(adminData.phone ?? "")) ??
      (await getAdmins()).find((a) => a.login === phone)

    // Проверяем что аккаунт активен
    if (localAdmin && !localAdmin.active) {
      return NextResponse.json({ error: "Аккаунт деактивирован" }, { status: 403 })
    }

    // Создаём локальный JWT чтобы middleware и AuthProvider работали как раньше
    const localToken = await signToken({
      id: String(localAdmin?.id ?? adminData.id ?? phone),
      name: String(localAdmin?.name ?? adminData.name ?? phone),
      login: String(localAdmin?.login ?? adminData.phone ?? phone),
      role: localAdmin?.role ?? (adminData.role === "super" ? "super" : "admin"),
      permissions: localAdmin?.permissions,
    })

    const response = NextResponse.json({ ok: true })

    response.cookies.set("admin_token", localToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    // Также сохраняем backend token для API-запросов
    if (backendToken) {
      response.cookies.set("backend_token", backendToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
    }

    // Save refresh token for automatic token renewal
    const refreshToken: string = data.refresh_token ?? ""
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
