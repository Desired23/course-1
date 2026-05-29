



import i18n from './i18n'

export interface RealtimeNotification {
  type: 'review_response' | 'new_review' | 'course_update' | 'promotion' | 'discussion'
  title: string
  message: string
  actionUrl?: string
}

class RealtimeNotificationService {
  private listeners: Array<(notification: RealtimeNotification) => void> = []
  private simulationInterval: NodeJS.Timeout | null = null


  private getMockNotifications(): RealtimeNotification[] {
    return [
      {
        type: 'new_review',
        title: i18n.t('realtime_notifications.new_five_star_review.title'),
        message: i18n.t('realtime_notifications.new_five_star_review.message'),
        actionUrl: '/instructor/reviews'
      },
      {
        type: 'new_review',
        title: i18n.t('realtime_notifications.new_review.title'),
        message: i18n.t('realtime_notifications.new_review.message'),
        actionUrl: '/instructor/reviews'
      }
    ]
  }





  startSimulation(intervalMs: number = 30000) {
    if (this.simulationInterval) {
      console.warn('Simulation already running')
      return
    }

    console.log('🔔 Starting realtime notification simulation...')

    this.simulationInterval = setInterval(() => {
      const notifications = this.getMockNotifications()
      const randomNotification = notifications[
        Math.floor(Math.random() * notifications.length)
      ]

      this.emit(randomNotification)
    }, intervalMs)
  }




  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
      this.simulationInterval = null
      console.log('🔕 Stopped realtime notification simulation')
    }
  }




  subscribe(callback: (notification: RealtimeNotification) => void) {
    this.listeners.push(callback)


    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }




  private emit(notification: RealtimeNotification) {
    console.log('📨 Emitting notification:', notification.title)
    this.listeners.forEach(callback => callback(notification))
  }




  notify(notification: RealtimeNotification) {
    this.emit(notification)
  }
}


export const realtimeNotificationService = new RealtimeNotificationService()


export const getNotificationIcon = (type: string) => {
  const icons: Record<string, string> = {
    review_response: '⭐',
    new_review: '📝',
    course_update: '📚',
    promotion: '🎁',
    discussion: '👥'
  }
  return icons[type] || '🔔'
}


export const getNotificationColor = (type: string) => {
  const colors: Record<string, string> = {
    review_response: 'yellow',
    new_review: 'green',
    course_update: 'blue',
    promotion: 'orange',
    discussion: 'purple'
  }
  return colors[type] || 'gray'
}
