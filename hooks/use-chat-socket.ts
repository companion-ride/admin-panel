"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, Socket } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/auth\/?$/, "") || ""
const SOCKET_PATH = "/api/ws/socket.io/"

interface ChatMessage {
  room_id: string
  message_id: string
  sender_id: string
  sender_role?: string
  content: string
  created_at: string
}

interface UseChatSocketOptions {
  /** Room ID to watch for new messages. null = don't filter. */
  roomId: string | null
  /** Called when a new message arrives for the watched room. */
  onMessage: (msg: ChatMessage) => void
  /** Called on connection state change. */
  onConnectionChange?: (connected: boolean) => void
}

export function useChatSocket({ roomId, onMessage, onConnectionChange }: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  // Stable ref for callbacks so we don't reconnect on every render
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const onConnectionRef = useRef(onConnectionChange)
  onConnectionRef.current = onConnectionChange
  const roomIdRef = useRef(roomId)
  roomIdRef.current = roomId

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return

    // Fetch backend token via protected API route
    let token: string
    try {
      const res = await fetch("/api/auth/socket-token")
      if (!res.ok) return
      const data = await res.json()
      token = data.token
    } catch {
      return
    }

    if (!token || !SOCKET_URL) return

    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
    })

    socket.on("connect", () => {
      setConnected(true)
      onConnectionRef.current?.(true)
    })

    socket.on("disconnect", () => {
      setConnected(false)
      onConnectionRef.current?.(false)
    })

    socket.on("chat_new_message", (data: ChatMessage) => {
      const watching = roomIdRef.current
      if (!watching || data.room_id === watching) {
        onMessageRef.current(data)
      }
    })

    socketRef.current = socket
  }, [])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { connected, disconnect }
}
