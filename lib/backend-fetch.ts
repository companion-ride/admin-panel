/**
 * Fetch wrapper that auto-refreshes backend_token on 401.
 * Use this from client components for calls to Next.js API routes
 * that proxy to backend services (chat, rides, etc.).
 */

let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Calls `fetch(url, options)`. If the response is 401, attempts to refresh
 * the backend token once and retries the original request.
 */
export async function backendFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options)

  if (res.status !== 401) return res

  // Deduplicate concurrent refresh attempts
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }

  const refreshed = await refreshPromise
  if (!refreshed) return res

  // Retry original request with new cookie
  return fetch(url, options)
}
