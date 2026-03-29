import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"

const ADMINS_FILE = path.join(process.cwd(), "data", "admins.json")

export interface AdminPermissions {
  viewAdmins: boolean
  editAdmins: boolean
  deleteAdmins: boolean
  inviteAdmins: boolean
  activateAdmins: boolean
}

export const ALL_PERMISSIONS: AdminPermissions = {
  viewAdmins: true,
  editAdmins: true,
  deleteAdmins: true,
  inviteAdmins: true,
  activateAdmins: true,
}

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  viewAdmins: false,
  editAdmins: false,
  deleteAdmins: false,
  inviteAdmins: false,
  activateAdmins: false,
}

export interface Admin {
  id: string
  name: string
  login: string
  phone?: string
  passwordHash: string
  role: "super" | "admin"
  active: boolean
  permissions: AdminPermissions
  createdAt: string
}

const INITIAL_ADMINS = [
  { id: "1", name: "Жибек",   login: "kersiie",     phone: "+77019629490", role: "super" as const, permissions: ALL_PERMISSIONS },
  { id: "2", name: "Дамир",   login: "k_damir",     role: "admin" as const, permissions: DEFAULT_PERMISSIONS },
  { id: "3", name: "Жасулан", login: "k_zhassulan", role: "admin" as const, permissions: DEFAULT_PERMISSIONS },
  { id: "4", name: "Диас",    login: "y_dias",      role: "admin" as const, permissions: DEFAULT_PERMISSIONS },
]

async function ensureAdminsFile(): Promise<Admin[]> {
  if (!fs.existsSync(ADMINS_FILE)) {
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD
    if (!initialPassword) {
      throw new Error("INITIAL_ADMIN_PASSWORD environment variable is required for first-time setup")
    }
    const dir = path.dirname(ADMINS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const admins: Admin[] = await Promise.all(
      INITIAL_ADMINS.map(async (a) => ({
        id: a.id,
        name: a.name,
        login: a.login,
        ...("phone" in a ? { phone: a.phone } : {}),
        passwordHash: await bcrypt.hash(initialPassword, 10),
        role: a.role,
        active: true,
        permissions: a.permissions,
        createdAt: new Date().toISOString(),
      }))
    )
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2))
    return admins
  }
  const admins = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8")) as Admin[]
  // Migrate old records missing active/permissions/phone
  let needsSave = false
  for (const a of admins) {
    if (a.active === undefined) { a.active = true; needsSave = true }
    if (!a.permissions) {
      a.permissions = a.role === "super" ? { ...ALL_PERMISSIONS } : { ...DEFAULT_PERMISSIONS }
      needsSave = true
    }
    // Migrate phone from initial admins
    if (!a.phone) {
      const initial = INITIAL_ADMINS.find((ia) => ia.login === a.login)
      if (initial && "phone" in initial) {
        a.phone = initial.phone
        needsSave = true
      }
    }
  }
  if (needsSave) saveAdmins(admins)
  return admins
}

function saveAdmins(admins: Admin[]): void {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2))
}

export async function getAdmins(): Promise<Admin[]> {
  return ensureAdminsFile()
}

export async function findAdminByLogin(login: string): Promise<Admin | null> {
  const admins = await ensureAdminsFile()
  return admins.find((a) => a.login === login) ?? null
}

export async function verifyAdminCredentials(login: string, password: string): Promise<Admin | null> {
  const admin = await findAdminByLogin(login)
  if (!admin) return null
  const valid = await bcrypt.compare(password, admin.passwordHash)
  return valid ? admin : null
}

export async function findAdminByPhone(phone: string): Promise<Admin | null> {
  const admins = await ensureAdminsFile()
  return admins.find((a) => a.phone === phone) ?? null
}

export async function createAdmin(data: {
  name: string
  login: string
  phone?: string
  password: string
  role: "super" | "admin"
  permissions?: AdminPermissions
}): Promise<{ admin: Admin | null; error?: string }> {
  const admins = await ensureAdminsFile()
  if (admins.find((a) => a.login === data.login)) {
    return { admin: null, error: "Логин уже занят" }
  }
  const newAdmin: Admin = {
    id: Date.now().toString(),
    name: data.name,
    login: data.login,
    ...(data.phone ? { phone: data.phone } : {}),
    passwordHash: await bcrypt.hash(data.password, 10),
    role: data.role,
    active: true,
    permissions: data.permissions ?? (data.role === "super" ? { ...ALL_PERMISSIONS } : { ...DEFAULT_PERMISSIONS }),
    createdAt: new Date().toISOString(),
  }
  admins.push(newAdmin)
  saveAdmins(admins)
  return { admin: newAdmin }
}

export async function updateAdmin(
  id: string,
  data: { name?: string; login?: string; phone?: string; password?: string; role?: "super" | "admin"; active?: boolean; permissions?: AdminPermissions }
): Promise<{ admin: Admin | null; error?: string }> {
  const admins = await ensureAdminsFile()
  const idx = admins.findIndex((a) => a.id === id)
  if (idx === -1) return { admin: null, error: "Администратор не найден" }

  if (data.login && data.login !== admins[idx].login) {
    if (admins.find((a) => a.login === data.login)) {
      return { admin: null, error: "Логин уже занят" }
    }
    admins[idx].login = data.login
  }
  if (data.name) admins[idx].name = data.name
  if (data.phone !== undefined) admins[idx].phone = data.phone || undefined
  if (data.password) admins[idx].passwordHash = await bcrypt.hash(data.password, 10)
  if (data.role) admins[idx].role = data.role
  if (data.active !== undefined) admins[idx].active = data.active
  if (data.permissions) admins[idx].permissions = data.permissions

  saveAdmins(admins)
  return { admin: admins[idx] }
}

export async function deleteAdmin(id: string): Promise<boolean> {
  const admins = await ensureAdminsFile()
  const filtered = admins.filter((a) => a.id !== id)
  if (filtered.length === admins.length) return false
  saveAdmins(filtered)
  return true
}
