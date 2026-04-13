import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { API_BASE_URL, RIDES_URL, CONFIG_URL, CHAT_URL } from "@/lib/api"

// GET /api/health — check health of all backend services
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const gatewayBase = API_BASE_URL.replace(/\/api\/auth\/?$/, "")

  const services = [
    { name: "API Gateway", url: `${gatewayBase}/health` },
    { name: "Auth Service", url: `${API_BASE_URL}/health` },
    { name: "Rides Service", url: `${RIDES_URL}/health` },
    { name: "Chat Service", url: `${CHAT_URL}/health` },
    { name: "Config Service", url: `${CONFIG_URL}/health` },
    { name: "Location Service", url: `${API_BASE_URL.replace(/\/api\/auth\/?$/, "/api/location")}/health` },
    { name: "Pathfinder Service", url: `${API_BASE_URL.replace(/\/api\/auth\/?$/, "/api/pathfinder")}/health` },
    { name: "SocketIO Handler", url: `${API_BASE_URL.replace(/\/api\/auth\/?$/, "/api/ws")}/health` },
  ]

  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" }

  const results = await Promise.allSettled(
    services.map(async (svc) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      try {
        const res = await fetch(svc.url, { headers, signal: controller.signal })
        clearTimeout(timeout)
        return { name: svc.name, ok: res.ok, status: res.status }
      } catch {
        clearTimeout(timeout)
        return { name: svc.name, ok: false, status: 0 }
      }
    })
  )

  const checks = results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { name: services[i].name, ok: false, status: 0 }
  )

  return NextResponse.json(checks)
}
