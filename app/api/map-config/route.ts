import { NextResponse } from "next/server"
import { RIDES_URL } from "@/lib/api"

// GET /api/map-config → GET /api/rides/config (fetches 2GIS API key)
export async function GET() {
  // Try backend first
  try {
    const res = await fetch(`${RIDES_URL}/config`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.map_api_key) {
        return NextResponse.json({ map_api_key: data.map_api_key })
      }
    }
  } catch {
    // fallback to env
  }

  // Fallback to env variable
  const key = process.env.NEXT_PUBLIC_2GIS_API_KEY || ""
  return NextResponse.json({ map_api_key: key })
}
