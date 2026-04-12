import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

// Returns backend_token to the client so it can be used for Socket.IO auth.
// Protected by admin_token check — only authenticated admins can get it.
export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get("admin_token")?.value
  if (!adminToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(adminToken)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const backendToken = request.cookies.get("backend_token")?.value
  if (!backendToken) return NextResponse.json({ error: "No backend token" }, { status: 401 })

  return NextResponse.json({ token: backendToken })
}
