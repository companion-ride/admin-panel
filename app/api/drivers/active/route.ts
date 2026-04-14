import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { API_BASE_URL, RIDES_URL } from "@/lib/api"

// GET /api/drivers/active → location-service active drivers + auth-service driver details
export async function GET(request: NextRequest) {
  const token = request.cookies.get("backend_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const backendToken = request.cookies.get("backend_token")?.value
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
  }

  try {
    // 1. Get active driver positions from location-service (via rides-service proxy)
    const res = await fetch(`${RIDES_URL}/admin/drivers/active`, { headers })
    const positions = await res.json().catch(() => null)

    if (!res.ok || !Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json(positions ?? [], { status: res.status })
    }

    // 2. Enrich each driver with name/rating/vehicle from auth-service
    const enriched = await Promise.all(
      positions.map(async (pos: Record<string, unknown>) => {
        const driverId = String(pos.id ?? "")
        if (!driverId) return pos

        try {
          const driverRes = await fetch(`${API_BASE_URL}/drivers/${driverId}`, { headers })
          if (driverRes.ok) {
            const info = await driverRes.json()
            return {
              ...pos,
              name: info.name ?? null,
              rating: info.avg_rating != null ? Number(info.avg_rating) : null,
              total_ratings: info.total_ratings ?? 0,
              vehicle_make: info.vehicle_make ?? null,
              vehicle_model: info.vehicle_model ?? null,
              license_plate: info.license_plate ?? null,
              image_url: info.image_url ?? null,
            }
          }
        } catch {
          // If enrichment fails, return position-only data
        }
        return pos
      })
    )

    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json([], { status: 502 })
  }
}
