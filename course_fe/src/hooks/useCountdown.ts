import { useState, useEffect, useRef, useCallback } from 'react'

export interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
}






export function useCountdown(
  targetDate: string | Date | null | undefined,
  onExpire?: () => void
): CountdownTime {
  const getRemaining = useCallback((): CountdownTime => {
    if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true }
    const diff = new Date(targetDate).getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true }
    const totalSeconds = Math.floor(diff / 1000)
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      totalSeconds,
      isExpired: false,
    }
  }, [targetDate])

  const [time, setTime] = useState<CountdownTime>(getRemaining)
  const expiredRef = useRef(false)

  useEffect(() => {
    expiredRef.current = false
    setTime(getRemaining())

    const interval = setInterval(() => {
      const t = getRemaining()
      setTime(t)
      if (t.isExpired && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [getRemaining, onExpire])

  return time
}
