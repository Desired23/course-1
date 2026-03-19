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
import { UserPagination } from '../../components/UserPagination'
import { getMyUserSettings, updateMyUserSettings } from '../../services/user-settings.api'
import {
  type Notification as NotifType,
  type NotificationType,
  getNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationColor,
  formatRelativeTime,
} from '../../services/notification.api'

const typeIconMap: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  system: Bell,
  course: BookOpen,
  payment: CreditCard,
  promotion: Gift,
  other: Info,
}

const notificationSettingsDefaults = {
  course_updates: true,
  promotions: true,
  discussions: true,
  reminders: true,
  achievements: true,
}

type NotificationSettingKey = keyof typeof notificationSettingsDefaults

export function NotificationsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotifType[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all')

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  const [notificationSettings, setNotificationSettings] = useState(notificationSettingsDefaults)
  const [savingSettings, setSavingSettings] = useState(false)

  const settingsLabels: Record<NotificationSettingKey, { label: string; description: string }> = {
    course_updates: {
      label: 'Course updates',
      description: 'Get notified when enrolled courses have new content',
    },
    promotions: {
      label: 'Promotions',
      description: 'Receive discount and campaign updates',
    },
    discussions: {
      label: 'Discussions',
      description: 'Get replies to your comments and Q&A',
    },
    reminders: {
      label: 'Learning reminders',
      description: 'Keep your study progress on track',
    },
    achievements: {
      label: 'Achievements',
      description: 'Get notified when you unlock milestones',
    },
  }

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      getNotificationsByUser(user.id, currentPage, pageSize, {
        type: typeFilter,
        is_read: selectedTab === 'unread' ? false : undefined,
        search: searchTerm || undefined,
        sort_by: 'newest',
      }),
      getNotificationsByUser(user.id, 1, 1, { is_read: false }),
    ])
      .then(([listRes, unreadRes]) => {
        if (cancelled) return
        setNotifications(listRes.results)
        setUnreadCount(unreadRes.count || 0)
        setTotalPages(listRes.total_pages || 1)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Cannot load notifications')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, currentPage, pageSize, selectedTab, typeFilter, searchTerm])

  useEffect(() => {
    let cancelled = false
    getMyUserSettings()
      .then((res) => {
        if (cancelled) return
        const incoming = (res.notification_preferences || {}) as Record<string, unknown>
        const merged = { ...notificationSettingsDefaults }

        for (const key of Object.keys(notificationSettingsDefaults) as NotificationSettingKey[]) {
          if (typeof incoming[key] === 'boolean') {
            merged[key] = incoming[key] as boolean
          }
        }

        setNotificationSettings(merged)
      })
      .catch(() => {
        // Keep local defaults
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch {
      // ignore
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // ignore
    }
  }

  const handleSaveNotificationSettings = async () => {
    setSavingSettings(true)
    try {
      await updateMyUserSettings({ notification_preferences: notificationSettings })
    } catch {
      // ignore explicit error banner, keep UX soft
    } finally {
      setSavingSettings(false)
    }
  }

  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTab, typeFilter, searchTerm, pageSize])

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
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">{t('notifications_page.title')}</h1>
            <p className="text-muted-foreground">Latest updates from your learning journey</p>
          </div>
          <Button variant="outline" onClick={handleMarkAllAsRead} className="gap-2">
            <Check className="h-4 w-4" />
            {t('notifications_page.mark_all_read')}
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'all' | 'unread')}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              {t('notifications_page.all')}
              {unreadCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">{t('notifications_page.unread')}</TabsTrigger>
          </TabsList>

          <Card className="mb-6">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                className="h-9 rounded-md border px-3 text-sm"
                placeholder="Search notifications"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | NotificationType)}
              >
                <option value="all">All types</option>
                <option value="system">System</option>
                <option value="course">Course</option>
                <option value="payment">Payment</option>
                <option value="promotion">Promotion</option>
                <option value="other">Other</option>
              </select>
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value="8">8 / page</option>
                <option value="12">12 / page</option>
                <option value="20">20 / page</option>
              </select>
              <Button
                variant="ghost"
                className="h-9"
                onClick={() => {
                  setSearchTerm('')
                  setTypeFilter('all')
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>

          <TabsContent value={selectedTab}>
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">{t('notifications_page.empty')}</h3>
                <p className="text-muted-foreground">{t('notifications_page.empty_subtitle')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {notifications.map((notification) => {
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
                                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notification.created_at)}</p>
                                </div>
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
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {currentPage}/{totalPages}</p>
                  <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(notificationSettings).map(([rawKey, enabled]) => {
              const key = rawKey as NotificationSettingKey
              const info = settingsLabels[key]
              if (!info) return null
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
                    onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, [key]: checked }))}
                  />
                </div>
              )
            })}
            <div className="pt-2">
              <Button onClick={handleSaveNotificationSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save notification settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
