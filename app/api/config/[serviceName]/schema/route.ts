import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { CONFIG_URL } from "@/lib/api"

function getBackendToken(request: NextRequest) {
  return request.cookies.get("backend_token")?.value ?? ""
}

async function getAuth(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return null
  return verifyToken(token)
}

// GET /api/config/[serviceName]/schema → GET /admin/schema/{service_name}
export async function GET(request: NextRequest, { params }: { params: Promise<{ serviceName: string }> }) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serviceName } = await params

  const res = await fetch(`${CONFIG_URL}/admin/schema/${serviceName}`, {
    headers: {
      Authorization: `Bearer ${getBackendToken(request)}`,
      "ngrok-skip-browser-warning": "true",
    },
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

// POST /api/config/[serviceName]/schema → POST /admin/schema/{service_name}
export async function POST(request: NextRequest, { params }: { params: Promise<{ serviceName: string }> }) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serviceName } = await params
  const body = await request.json()

  const res = await fetch(`${CONFIG_URL}/admin/schema/${serviceName}`, {
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
