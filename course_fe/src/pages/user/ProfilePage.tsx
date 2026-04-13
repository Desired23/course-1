import { useEffect, useState } from "react"
import { Camera, Mail, Calendar, BookOpen, Users, Edit2 } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Badge } from "../../components/ui/badge"
import { Skeleton } from '../../components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Separator } from "../../components/ui/separator"
import { motion } from 'motion/react'
import { useAuth } from "../../contexts/AuthContext"
import { useRouter } from "../../components/Router"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { getStudentStats, type StudentStats, getAllMyEnrollments, type Enrollment } from "../../services/enrollment.api"
import { listItemTransition } from '../../lib/motion'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateProfile } = useAuth()
  const { navigate } = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    website: user?.website || '',
    twitter: user?.twitter || '',
    facebook: user?.facebook || '',
    linkedin: user?.linkedin || '',
    youtube: user?.youtube || ''
  })

  const [isSaving, setIsSaving] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'edit' | 'courses' | 'settings'>('overview')
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const renderProfileSkeleton = () => (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`profile-stat-skeleton-${index}`} className="rounded-lg border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  )

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoadingData(true)

    Promise.all([
      getStudentStats().catch(() => null),
      getAllMyEnrollments().catch(() => [] as Enrollment[])
    ])
      .then(([statsData, enrollmentsData]) => {
        if (cancelled) return
        setStats(statsData)
        setMyEnrollments(enrollmentsData)
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false)
      })

    return () => { cancelled = true }
  }, [user?.id])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile(formData)
      setIsEditing(false)
      toast.success(t('profile.profile_updated'))
    } catch {
      toast.error(t('profile.update_failed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      website: user?.website || '',
      twitter: user?.twitter || '',
      facebook: user?.facebook || '',
      linkedin: user?.linkedin || '',
      youtube: user?.youtube || ''
    })
    setIsEditing(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">{t('profile.login_required')}</h2>
          <Button onClick={() => window.location.href = '/login'}>
            {t('profile.log_in')}
          </Button>
        </div>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {renderProfileSkeleton()}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-8 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="max-w-5xl mx-auto" variants={sectionStagger} initial="hidden" animate="show">

        <motion.div variants={fadeInUp}>
        <Card className="app-surface-elevated mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-2xl">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                  onClick={() => navigate('/account-settings')}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl mb-2">{user.name}</h1>
                    <div className="flex items-center gap-4 text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      <Badge variant="secondary">{user.roles?.[0] || 'user'}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {user.bio || t('profile.no_bio')}
                    </p>
                  </div>

                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {isEditing ? t('profile.cancel') : t('profile.edit_profile')}
                  </Button>
                </div>

                {user.roles?.includes('instructor') && (
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{user.totalCourses || 0} {t('profile.courses_label')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{user.totalStudents?.toLocaleString() || 0} {t('profile.students_label')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{t('profile.joined')} {user.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'overview' | 'edit' | 'courses' | 'settings')} className="space-y-6">
          <TabsList className="relative grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1">
            <TabsTrigger value="overview" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'overview' && (
                <motion.span
                  layoutId="profile-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('profile.overview')}</span>
            </TabsTrigger>
            <TabsTrigger value="edit" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'edit' && (
                <motion.span
                  layoutId="profile-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('profile.edit_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'courses' && (
                <motion.span
                  layoutId="profile-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('profile.my_courses_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'settings' && (
                <motion.span
                  layoutId="profile-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('profile.settings_tab')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={listItemTransition(0)}>
              <Card className="app-interactive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('profile.learning_progress')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl mb-1">{stats?.courses_completed ?? 0}</div>
                  <p className="text-sm text-muted-foreground">{t('profile.courses_completed')}</p>
                </CardContent>
              </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={listItemTransition(1)}>
              <Card className="app-interactive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('common.certificate')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl mb-1">{stats?.certificates_earned ?? 0}</div>
                  <p className="text-sm text-muted-foreground">{t('profile.certificates_earned')}</p>
                </CardContent>
              </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={listItemTransition(2)}>
              <Card className="app-interactive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('profile.study_time')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl mb-1">{Math.floor((stats?.total_time_spent ?? 0) / 3600)}h</div>
                  <p className="text-sm text-muted-foreground">{t('profile.total_learning_time')}</p>
                </CardContent>
              </Card>
              </motion.div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('profile.recent_activity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recent_activity?.length ? (
                    stats.recent_activity.slice(0, 5).map((activity, idx) => (
                      <div key={`${activity.lesson_title}-${idx}`} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm">
                            {t('profile.recent_activity_item', {
                              lesson: activity.lesson_title,
                              course: activity.course_title,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('profile.no_recent_activity')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.edit_profile_info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('profile.full_name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">{t('profile.bio')}</Label>
                  <Textarea
                    id="bio"
                    placeholder={t('profile.placeholders.bio')}
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>

                <Separator />

                <h4 className="font-medium">{t('profile.social_links')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">{t('profile.website')}</Label>
                    <Input
                      id="website"
                      placeholder={t('profile.placeholders.website')}
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter">{t('profile.twitter')}</Label>
                    <Input
                      id="twitter"
                      placeholder={t('profile.placeholders.twitter')}
                      value={formData.twitter}
                      onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">{t('profile.linkedin')}</Label>
                    <Input
                      id="linkedin"
                      placeholder={t('profile.placeholders.linkedin')}
                      value={formData.linkedin}
                      onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="youtube">{t('profile.youtube')}</Label>
                    <Input
                      id="youtube"
                      placeholder={t('profile.placeholders.youtube')}
                      value={formData.youtube}
                      onChange={(e) => setFormData({...formData, youtube: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? t('profile.saving') : t('profile.save_changes')}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    {t('profile.cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('my_learning.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {myEnrollments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t('profile.no_courses')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myEnrollments.slice(0, 8).map((enrollment, index) => (
                      <motion.div
                        key={enrollment.enrollment_id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={listItemTransition(index)}
                        className="flex items-center justify-between border rounded-md p-3"
                      >
                        <div>
                          <p className="font-medium">{enrollment.course.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('profile.enrolled_on', { date: new Date(enrollment.enrollment_date).toLocaleDateString() })}
                          </p>
                        </div>
                        <Badge variant="outline">{enrollment.status}</Badge>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('account_settings.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t('profile.email_notifications')}</h4>
                    <p className="text-sm text-muted-foreground">{t('profile.email_notifications_desc')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/account-settings')}>
                    {t('profile.configure')}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t('profile.privacy_settings')}</h4>
                    <p className="text-sm text-muted-foreground">{t('profile.privacy_settings_desc')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/account-settings')}>
                    {t('profile.manage')}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t('profile.delete_account')}</h4>
                    <p className="text-sm text-muted-foreground">{t('profile.delete_account_desc')}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => navigate('/account-settings')}>
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
