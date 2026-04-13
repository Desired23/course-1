






import { useEffect, useRef, useCallback, useState } from 'react'
import { getAccessToken, refreshAccessToken } from '../services/http'



const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'


function getWsBase(): string {

  const httpBase = API_BASE.replace(/\/api\/?$/, '')

  return httpBase.replace(/^http/, 'ws')
}



export interface UseWebSocketOptions {

  path: string

  onMessage?: (data: any) => void

  onOpen?: () => void

  onClose?: (event: CloseEvent) => void

  onError?: (event: Event) => void

  enabled?: boolean

  maxRetries?: number

  baseDelay?: number

  heartbeatInterval?: number
}

export interface UseWebSocketReturn {

  sendJsonMessage: (data: any) => void

  readyState: number

  isConnected: boolean

  reconnect: () => void

  disconnect: () => void
}



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

  const connect = useCallback(async () => {
    cleanup()


    let token = getAccessToken()
    if (token) {
      try {
        token = await refreshAccessToken()
      } catch {
        token = getAccessToken()
      }
    }
    if (!token) return

    const url = `${getWsBase()}${path}${path.includes('?') ? '&' : '?'}token=${token}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      retriesRef.current = 0
      setReadyState(WebSocket.OPEN)
      onOpenRef.current?.()


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
        if (data.type === 'pong') return
        onMessageRef.current?.(data)
      } catch {

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
    retriesRef.current = maxRetries
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
