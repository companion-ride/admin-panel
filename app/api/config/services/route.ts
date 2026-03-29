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

// GET /api/config/services → GET /admin/services
export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await fetch(`${CONFIG_API}/admin/services`, {
    headers: {
      Authorization: `Bearer ${getBackendToken(request)}`,
      "ngrok-skip-browser-warning": "true",
    },
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? [], { status: res.status })
}

// POST /api/config/services → POST /admin/services
export async function POST(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  const res = await fetch(`${CONFIG_API}/admin/services`, {
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
