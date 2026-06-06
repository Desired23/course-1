import { useEffect, useRef } from 'react'
import { useNotifications, type IncomingNotification } from '../contexts/NotificationContext'

/**
 * Lắng nghe luồng notification realtime (WS) và gọi `onMatch` khi nhận được
 * notification có `notification_code` nằm trong `codes`. Dùng để các trang tự
 * refetch dữ liệu khi một actor khác (admin/cron) đổi trạng thái mà người dùng
 * đang xem — tái dùng kết nối WS notifications sẵn có, không mở thêm socket.
 */
export function useNotificationRefetch(
  codes: string[],
  onMatch: (n: IncomingNotification) => void,
) {
  const { subscribeToNotifications } = useNotifications()
  const onMatchRef = useRef(onMatch)
  onMatchRef.current = onMatch
  const codesKey = codes.join(',')

  useEffect(() => {
    const codeSet = new Set(codesKey.split(',').filter(Boolean))
    return subscribeToNotifications((n) => {
      if (n?.notification_code && codeSet.has(n.notification_code)) {
        onMatchRef.current(n)
      }
    })
  }, [subscribeToNotifications, codesKey])
}
