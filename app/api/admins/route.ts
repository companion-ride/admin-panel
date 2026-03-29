import { NextRequest, NextResponse } from "next/server"
import { getAdmins, createAdmin } from "@/lib/admins"
import { verifyToken } from "@/lib/auth"

async function getAuthAdmin(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(request: NextRequest) {
  const auth = await getAuthAdmin(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const canView = auth.role === "super" || auth.permissions?.viewAdmins
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admins = await getAdmins()
  return NextResponse.json(
    admins.map((a) => ({
      id: a.id,
      name: a.name,
      login: a.login,
      phone: a.phone ?? "",
      role: a.role,
      active: a.active,
      permissions: a.permissions,
      createdAt: a.createdAt,
    }))
  )
}

export async function POST(request: NextRequest) {
  const auth = await getAuthAdmin(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const canEdit = auth.role === "super" || auth.permissions?.editAdmins
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { name, login, phone, password, role, permissions } = body

  if (!name || !login || !password) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 })
  }

  const { admin, error } = await createAdmin({
    name,
    login,
    phone: phone || undefined,
    password,
    role: role === "super" ? "super" : "admin",
    permissions,
  })

  if (error) return NextResponse.json({ error }, { status: 409 })

  return NextResponse.json({
    id: admin!.id,
    name: admin!.name,
    login: admin!.login,
    phone: admin!.phone ?? "",
    role: admin!.role,
    active: admin!.active,
    permissions: admin!.permissions,
    createdAt: admin!.createdAt,
  })
}
