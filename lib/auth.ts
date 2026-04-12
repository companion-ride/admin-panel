import { SignJWT, jwtVerify } from "jose"

function getSecret() {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) throw new Error("JWT_SECRET environment variable is not set")
  return new TextEncoder().encode(jwtSecret)
}

export interface AdminTokenPayload {
  id: string
  name: string
  login: string
  role: "super" | "admin"
  permissions?: {
    viewAdmins: boolean
    editAdmins: boolean
    deleteAdmins: boolean
    inviteAdmins: boolean
    activateAdmins: boolean
  }
}

export async function signToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as AdminTokenPayload
  } catch {
    return null
  }
}
