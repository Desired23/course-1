/**
 * Realtime Notification Simulator
 * Simulates realtime notifications for Q&A and Reviews
 */

export interface RealtimeNotification {
  type: 'qna_response' | 'review_response' | 'new_question' | 'new_review' | 'course_update' | 'promotion' | 'discussion'
  title: string
  message: string
  actionUrl?: string
}

class RealtimeNotificationService {
  private listeners: Array<(notification: RealtimeNotification) => void> = []
  private simulationInterval: NodeJS.Timeout | null = null
  
  // Mock notification templates
  private mockNotifications: RealtimeNotification[] = [
    {
      type: 'new_question',
      title: 'New Question',
      message: 'A student asked: "How do I implement useEffect properly?"',
      actionUrl: '/instructor/qna'
    },
    {
      type: 'new_review',
      title: 'New 5-Star Review',
      message: 'Sarah Johnson left a glowing review on your React course',
      actionUrl: '/instructor/reviews'
    },
    {
      type: 'qna_response',
      title: 'Q&A Notification',
      message: 'Your answer helped 3 more students!',
      actionUrl: '/instructor/qna'
    },
    {
      type: 'new_question',
      title: 'Urgent Question',
      message: 'Student needs help with deployment issues',
      actionUrl: '/instructor/qna'
    },
    {
      type: 'new_review',
      title: 'New Review',
      message: 'Mike Chen rated your course 4 stars',
      actionUrl: '/instructor/reviews'
    }
  ]

  /**
   * Start simulating realtime notifications
   * @param intervalMs - Interval in milliseconds between notifications
   */
  startSimulation(intervalMs: number = 30000) {
    if (this.simulationInterval) {
      console.warn('Simulation already running')
      return
    }

    console.log('🔔 Starting realtime notification simulation...')
    
    this.simulationInterval = setInterval(() => {
      const randomNotification = this.mockNotifications[
        Math.floor(Math.random() * this.mockNotifications.length)
      ]
      
      this.emit(randomNotification)
    }, intervalMs)
  }

  /**
   * Stop the simulation
   */
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
      this.simulationInterval = null
      console.log('🔕 Stopped realtime notification simulation')
    }
  }

  /**
   * Subscribe to realtime notifications
   */
  subscribe(callback: (notification: RealtimeNotification) => void) {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Emit a notification to all listeners
   */
  private emit(notification: RealtimeNotification) {
    console.log('📨 Emitting notification:', notification.title)
    this.listeners.forEach(callback => callback(notification))
  }

  /**
   * Manually trigger a notification
   */
  notify(notification: RealtimeNotification) {
    this.emit(notification)
  }
}

// Export singleton instance
export const realtimeNotificationService = new RealtimeNotificationService()

// Helper to format notification based on type
export const getNotificationIcon = (type: string) => {
  const icons: Record<string, string> = {
    qna_response: '💬',
    review_response: '⭐',
    new_question: '❓',
    new_review: '📝',
    course_update: '📚',
    promotion: '🎁',
    discussion: '👥'
  }
  return icons[type] || '🔔'
}

// Helper to get notification color
export const getNotificationColor = (type: string) => {
  const colors: Record<string, string> = {
    qna_response: 'blue',
    review_response: 'yellow',
    new_question: 'purple',
    new_review: 'green',
    course_update: 'blue',
    promotion: 'orange',
    discussion: 'purple'
  }
  return colors[type] || 'gray'
}
