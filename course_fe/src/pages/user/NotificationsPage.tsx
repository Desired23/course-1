import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Switch } from "../../components/ui/switch"
import { Label } from "../../components/ui/label"
import { Bell, BookOpen, CreditCard, Gift, Info, Check, Loader2, Settings } from 'lucide-react'
import { useTranslation } from "react-i18next"
import { useAuth } from '../../contexts/AuthContext'
import {
  type Notification as NotifType,
  type NotificationType,
  getAllNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationColor,
  formatRelativeTime,
} from '../../services/notification.api'

/** Map notification type -> Lucide icon component. */
const typeIconMap: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  system: Bell,
  course: BookOpen,
  payment: CreditCard,
  promotion: Gift,
  other: Info,
}

export function NotificationsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotifType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('all')

  // Static notification settings (for future API integration)
  const [notificationSettings, setNotificationSettings] = useState({
    course_updates: true,
    promotions: true,
    discussions: true,
    reminders: true,
    achievements: true,
  })

  const settingsLabels: Record<string, { label: string; description: string }> = {
    course_updates: {
      label: 'Cập nhật khóa học',
      description: 'Nhận thông báo khi khóa học bạn đăng ký có nội dung mới',
    },
    promotions: {
      label: 'Khuyến mãi',
      description: 'Nhận thông báo về ưu đãi và khuyến mãi mới',
    },
    discussions: {
      label: 'Thảo luận',
      description: 'Nhận thông báo khi có người trả lời bình luận của bạn',
    },
    reminders: {
      label: 'Nhắc nhở học tập',
      description: 'Nhận nhắc nhở để duy trì tiến độ học tập',
    },
    achievements: {
      label: 'Thành tựu',
      description: 'Nhận thông báo khi đạt được thành tựu mới',
    },
  }

  // Fetch notifications
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    getAllNotificationsByUser(user.id)
      .then((data) => {
        if (!cancelled) setNotifications(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Khong the tai thong bao')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id])

  // Handlers
  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch { /* silent */ }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch { /* silent */ }
  }

  // Derived
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const filteredNotifications =
    selectedTab === 'unread'
      ? notifications.filter((n) => !n.is_read)
      : notifications

  // Loading / Error
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Thu lai</Button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">{t('notifications_page.title')}</h1>
            <p className="text-muted-foreground">
              Cap nhat moi nhat tu hanh trinh hoc tap
            </p>
          </div>
          <Button variant="outline" onClick={handleMarkAllAsRead} className="gap-2">
            <Check className="h-4 w-4" />
            {t('notifications_page.mark_all_read')}
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              {t('notifications_page.all')}
              {unreadCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">{t('notifications_page.unread')}</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab}>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">{t('notifications_page.empty')}</h3>
                <p className="text-muted-foreground">{t('notifications_page.empty_subtitle')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const Icon = typeIconMap[notification.type] || Bell
                  const colorClass = getNotificationColor(notification.type)
                  return (
                    <Card
                      key={notification.id}
                      className={`transition-all hover:shadow-md ${!notification.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatRelativeTime(notification.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!notification.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Notification Settings — static UI for future development */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cài đặt thông báo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(notificationSettings).map(([key, enabled]) => {
              const info = settingsLabels[key]
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`setting-${key}`} className="text-base font-medium">
                      {info.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                  <Switch
                    id={`setting-${key}`}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
