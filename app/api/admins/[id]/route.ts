import { NextRequest, NextResponse } from "next/server"
import { updateAdmin, deleteAdmin } from "@/lib/admins"
import { verifyToken } from "@/lib/auth"

async function getAuthAdmin(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthAdmin(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const canEdit = auth.role === "super" || auth.permissions?.editAdmins
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { name, login, phone, password, role, active, permissions } = body

  // Only super or admin with activateAdmins can change active status
  if (active !== undefined) {
    const canActivate = auth.role === "super" || auth.permissions?.activateAdmins
    if (!canActivate) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { admin, error } = await updateAdmin(id, {
    name,
    login,
    phone,
    password: password || undefined,
    role: role === "super" ? "super" : role === "admin" ? "admin" : undefined,
    active,
    permissions,
  })

  if (error) return NextResponse.json({ error }, { status: error === "Администратор не найден" ? 404 : 409 })

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthAdmin(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const canDelete = auth.role === "super" || auth.permissions?.deleteAdmins
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  if (id === auth.id) {
    return NextResponse.json({ error: "Нельзя удалить себя" }, { status: 400 })
  }

  const deleted = await deleteAdmin(id)
  if (!deleted) return NextResponse.json({ error: "Администратор не найден" }, { status: 404 })

  return NextResponse.json({ ok: true })
}
