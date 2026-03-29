import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

const CONFIG_API = "https://companion.kopir.uk/api/config"

function getBackendToken(request: NextRequest) {
  return request.cookies.get("backend_token")?.value ?? ""
}

async function getAuth(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return null
  return verifyToken(token)
}

// POST /api/config/[serviceName]/schema → POST /admin/schema/{service_name}
export async function POST(request: NextRequest, { params }: { params: Promise<{ serviceName: string }> }) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serviceName } = await params
  const body = await request.json()

  const res = await fetch(`${CONFIG_API}/admin/schema/${serviceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getBackendToken(request)}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}
