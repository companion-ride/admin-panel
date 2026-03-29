import { NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials } from "@/lib/admins"
import { signToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json()

    if (!login || !password) {
      return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 })
    }

    const admin = await verifyAdminCredentials(login, password)

    if (!admin) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 })
    }

    if (!admin.active) {
      return NextResponse.json({ error: "Аккаунт деактивирован" }, { status: 403 })
    }

    const token = await signToken({
      id: admin.id,
      name: admin.name,
      login: admin.login,
      role: admin.role,
      permissions: admin.permissions,
    })

    const response = NextResponse.json({
      ok: true,
      admin: { id: admin.id, name: admin.name, login: admin.login, role: admin.role, permissions: admin.permissions },
    })

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
