import { jwtVerify } from "jose"

function getSecret() {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) throw new Error("JWT_SECRET environment variable is not set")
  return new TextEncoder().encode(jwtSecret)
}

export interface AdminTokenPayload {
  sub: string
  role: string
  type: string
}

export async function verifyToken(token: string | undefined): Promise<AdminTokenPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== "access") return null
    return payload as unknown as AdminTokenPayload
  } catch {
    return null
  }
}
