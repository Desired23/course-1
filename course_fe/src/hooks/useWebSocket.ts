/**
 * useWebSocket - Generic reconnecting WebSocket hook
 *
 * Connects to a Django Channels WS endpoint with JWT auth.
 * Supports auto-reconnect, heartbeat (ping/pong), and typed messages.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { getAccessToken } from '../services/http'

// ─── Helpers ──────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

/** Derive the WebSocket base from the HTTP API base URL. */
function getWsBase(): string {
  // Strip /api suffix
  const httpBase = API_BASE.replace(/\/api\/?$/, '')
  // http → ws, https → wss
  return httpBase.replace(/^http/, 'ws')
}

// ─── Types ────────────────────────────────────────────────────────

export interface UseWebSocketOptions {
  /** WS path, e.g. "/ws/notifications/" */
  path: string
  /** Called on every incoming JSON message */
  onMessage?: (data: any) => void
  /** Called when WS connection opens */
  onOpen?: () => void
  /** Called when WS connection closes */
  onClose?: (event: CloseEvent) => void
  /** Called on error */
  onError?: (event: Event) => void
  /** Whether to auto-connect (default: true) */
  enabled?: boolean
  /** Max reconnect attempts (default: 10) */
  maxRetries?: number
  /** Base delay in ms for exponential back-off (default: 1000) */
  baseDelay?: number
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number
}

export interface UseWebSocketReturn {
  /** Send a JSON message to the server */
  sendJsonMessage: (data: any) => void
  /** Current connection state */
  readyState: number
  /** Whether connected */
  isConnected: boolean
  /** Manually reconnect */
  reconnect: () => void
  /** Manually disconnect */
  disconnect: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    path,
    onMessage,
    onOpen,
    onClose,
    onError,
    enabled = true,
    maxRetries = 10,
    baseDelay = 1000,
    heartbeatInterval = 30000,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval>>()
  const mountedRef = useRef(true)

  const [readyState, setReadyState] = useState<number>(WebSocket.CLOSED)

  // Stable callback refs
  const onMessageRef = useRef(onMessage)
  const onOpenRef = useRef(onOpen)
  const onCloseRef = useRef(onClose)
  const onErrorRef = useRef(onError)
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { onOpenRef.current = onOpen }, [onOpen])
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const cleanup = useCallback(() => {
    clearTimeout(reconnectTimerRef.current)
    clearInterval(heartbeatTimerRef.current)
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    cleanup()

    const token = getAccessToken()
    if (!token) return // Not authenticated

    const url = `${getWsBase()}${path}${path.includes('?') ? '&' : '?'}token=${token}`
    
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      retriesRef.current = 0
      setReadyState(WebSocket.OPEN)
      onOpenRef.current?.()

      // Start heartbeat
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, heartbeatInterval)
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'pong') return // Heartbeat response
        onMessageRef.current?.(data)
      } catch {
        // Ignore non-JSON messages
      }
    }

    ws.onerror = (event) => {
      if (!mountedRef.current) return
      onErrorRef.current?.(event)
    }

    ws.onclose = (event) => {
      if (!mountedRef.current) return
      clearInterval(heartbeatTimerRef.current)
      setReadyState(WebSocket.CLOSED)
      onCloseRef.current?.(event)

      // Auto-reconnect with exponential back-off
      if (retriesRef.current < maxRetries && mountedRef.current) {
        const delay = Math.min(baseDelay * Math.pow(2, retriesRef.current), 30000)
        retriesRef.current++
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect()
        }, delay)
      }
    }

    setReadyState(WebSocket.CONNECTING)
  }, [path, cleanup, maxRetries, baseDelay, heartbeatInterval])

  const sendJsonMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const disconnect = useCallback(() => {
    retriesRef.current = maxRetries // Prevent auto-reconnect
    cleanup()
    setReadyState(WebSocket.CLOSED)
  }, [cleanup, maxRetries])

  const reconnect = useCallback(() => {
    retriesRef.current = 0
    connect()
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    if (enabled) {
      connect()
    }
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [enabled, connect, cleanup])

  return {
    sendJsonMessage,
    readyState,
    isConnected: readyState === WebSocket.OPEN,
    reconnect,
    disconnect,
  }
}
