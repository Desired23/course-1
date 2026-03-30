import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Separator } from '../../components/ui/separator'
import { Progress } from '../../components/ui/progress'
import { UserPagination } from '../../components/UserPagination'
import { 
  Settings, 
  Edit, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  Users, 
  BookOpen, 
  Award, 
  Globe, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Youtube, 
  Mail,
  Calendar,
  MapPin,
  GraduationCap,
  Trophy,
  Target,
  Heart
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getMyInstructorProfile } from '../../services/instructor.api'
import { getInstructorDashboardStats, type InstructorDashboardStats } from '../../services/instructor.api'
import { getAllCourses } from '../../services/course.api'
import { getAllReviewsByInstructor } from '../../services/review.api'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'


interface CustomSection {
  id: string
  title: string
  content: string
  visible: boolean
  order: number
  type: 'text' | 'achievements' | 'testimonials' | 'gallery'
}

interface InstructorStats {
  totalStudents: number
  totalCourses: number
  averageRating: number
  totalReviews: number
  coursesCompleted: number
  totalHours: number
}

// Stats, courses and testimonials are now fetched from API

export function InstructorProfilePage() {
  const { user, updateProfile, updateProfileSettings, hasPermission } = useAuth()
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [newSection, setNewSection] = useState<Partial<CustomSection>>({
    title: '',
    content: '',
    type: 'text',
    visible: true
  })

  // API-driven state
  const [stats, setStats] = useState<InstructorStats>({
    totalStudents: 0, totalCourses: 0, averageRating: 0, totalReviews: 0, coursesCompleted: 0, totalHours: 0
  })
  const [instructorCourses, setInstructorCourses] = useState<any[]>([])
  const [testimonials, setTestimonials] = useState<any[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [courseSortBy, setCourseSortBy] = useState('students')
  const [coursePage, setCoursePage] = useState(1)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function fetchProfileData() {
      try {
        const profile = await getMyInstructorProfile(user!.id)
        if (cancelled) return

        // Fetch dashboard stats
        try {
          const dashStats = await getInstructorDashboardStats(profile.id)
          if (cancelled) return
          setStats({
            totalStudents: dashStats.total_students,
            totalCourses: dashStats.total_courses,
            averageRating: dashStats.average_rating,
            totalReviews: dashStats.total_reviews,
            coursesCompleted: 0,
            totalHours: 0,
          })
        } catch { /* stats endpoint may fail */ }

        // Fetch instructor courses
        try {
          const courses = await getAllCourses({ instructor_id: profile.id })
          if (cancelled) return
          setInstructorCourses(courses.map(c => ({
            id: c.id,
            title: c.title,
            students: c.total_students || 0,
            rating: parseFloat(String(c.rating || 0)),
            reviews: 0,
            image: c.thumbnail || '/api/placeholder/300/200',
            price: parseFloat(String(c.price || 0)),
            bestseller: false,
          })))
        } catch { /* no courses */ }

        // Fetch reviews as testimonials
        try {
          const reviews = await getAllReviewsByInstructor(profile.id)
          if (cancelled) return
      setTestimonials(reviews.slice(0, 5).map(r => ({
        id: r.id,
        student: r.user_detail?.full_name || t('instructor_profile_page.fallbacks.student'),
        avatar: r.user_detail?.avatar || '/api/placeholder/40/40',
        content: r.comment || '',
        rating: r.rating,
        course: r.course_detail?.title || t('instructor_profile_page.fallbacks.course'),
      })))
        } catch { /* no reviews */ }
      } catch (err) {
        console.error('Failed to load profile data:', err)
      }
    }
    fetchProfileData()
    return () => { cancelled = true }
  }, [user?.id])

  const canEditProfile = hasPermission('instructor.courses.create')

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('instructor_profile_page.login_required')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const profileSettings = user.profileSettings || {
    showCourses: true,
    showStats: true,
    showBio: true,
    showSocialLinks: true,
    customSections: []
  }

  const handleSaveProfile = () => {
    setIsEditing(false)
    toast.success(t('instructor_profile_page.toasts.profile_saved'))
  }

  const handleAddSection = () => {
    const section: CustomSection = {
      id: Date.now().toString(),
      title: newSection.title!,
      content: newSection.content!,
      type: newSection.type as CustomSection['type'],
      visible: newSection.visible!,
      order: profileSettings.customSections.length + 1
    }
    
    const updatedSections = [...profileSettings.customSections, section]
    updateProfileSettings({ customSections: updatedSections })
    setIsAddingSectionOpen(false)
    setNewSection({ title: '', content: '', type: 'text', visible: true })
  }

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = profileSettings.customSections.filter(s => s.id !== sectionId)
    updateProfileSettings({ customSections: updatedSections })
  }

  const handleToggleSectionVisibility = (sectionId: string) => {
    const updatedSections = profileSettings.customSections.map(s =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    )
    updateProfileSettings({ customSections: updatedSections })
  }

  const handleSettingChange = (setting: keyof typeof profileSettings, value: boolean) => {
    updateProfileSettings({ [setting]: value })
  }

  const filteredCourses = [...instructorCourses]
    .filter((course) => course.title.toLowerCase().includes(courseSearch.toLowerCase()))
    .sort((a, b) => {
      if (courseSortBy === 'rating') return b.rating - a.rating
      if (courseSortBy === 'price') return b.price - a.price
      return b.students - a.students
    })

  useEffect(() => {
    setCoursePage(1)
  }, [courseSearch, courseSortBy])

  const COURSES_PER_PAGE = 6
  const courseTotalPages = Math.max(1, Math.ceil(filteredCourses.length / COURSES_PER_PAGE))
  const paginatedCourses = filteredCourses.slice(
    (coursePage - 1) * COURSES_PER_PAGE,
    coursePage * COURSES_PER_PAGE
  )

  useEffect(() => {
    if (coursePage > courseTotalPages) setCoursePage(courseTotalPages)
  }, [coursePage, courseTotalPages])

  return (
    <div className="p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('instructor_profile_page.title')}</h1>
            <p className="text-muted-foreground">{t('instructor_profile_page.subtitle')}</p>
          </div>
          {canEditProfile && (
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open('/instructor/profile/public', '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              {t('instructor_profile_page.actions.view_public_profile')}
            </Button>
            <Button onClick={() => setIsEditing(!isEditing)}>
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? t('instructor_profile_page.actions.cancel') : t('instructor_profile_page.actions.edit_profile')}
            </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="preview">{t('instructor_profile_page.tabs.preview')}</TabsTrigger>
            {canEditProfile && <TabsTrigger value="settings">{t('instructor_profile_page.tabs.settings')}</TabsTrigger>}
            {canEditProfile && <TabsTrigger value="customize">{t('instructor_profile_page.tabs.customize')}</TabsTrigger>}
          </TabsList>

        <TabsContent value="preview" className="space-y-6">
          {/* Header Section */}
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-2xl">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold">{user.name}</h1>
                    <p className="text-xl text-muted-foreground">{t('instructor_profile_page.preview.professional_title')}</p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{stats.averageRating}</span>
                        <span className="text-muted-foreground">({t('instructor_profile_page.preview.reviews_count', { count: stats.totalReviews.toLocaleString() })})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-5 w-5 text-blue-500" />
                        <span>{t('instructor_profile_page.preview.students_count', { count: stats.totalStudents.toLocaleString() })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-5 w-5 text-green-500" />
                        <span>{t('instructor_profile_page.preview.courses_count', { count: stats.totalCourses })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {profileSettings.showBio && user.bio && (
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {user.bio}
                      </p>
                    </div>
                  )}
                  
                  {profileSettings.showSocialLinks && (
                    <div className="flex items-center gap-4">
                      {user.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={user.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.website')}
                          </a>
                        </Button>
                      )}
                      {user.twitter && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={user.twitter} target="_blank" rel="noopener noreferrer">
                            <Twitter className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.twitter')}
                          </a>
                        </Button>
                      )}
                      {user.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={user.linkedin} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.linkedin')}
                          </a>
                        </Button>
                      )}
                      {user.youtube && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={user.youtube} target="_blank" rel="noopener noreferrer">
                            <Youtube className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.youtube')}
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Section */}
          {profileSettings.showStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {t('instructor_profile_page.stats.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalStudents.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{t('instructor_profile_page.stats.total_students')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.totalCourses}</div>
                    <div className="text-sm text-muted-foreground">{t('instructor_profile_page.stats.courses_created')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{stats.averageRating}</div>
                    <div className="text-sm text-muted-foreground">{t('instructor_profile_page.stats.average_rating')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats.totalHours}h</div>
                    <div className="text-sm text-muted-foreground">{t('instructor_profile_page.stats.content_hours')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Sections */}
          {profileSettings.customSections
            .filter(section => section.visible)
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {section.type === 'text' && (
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{section.content}</p>
                    </div>
                  )}
                  {section.type === 'achievements' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Award className="h-8 w-8 text-yellow-500" />
                        <div>
                          <h4 className="font-semibold">{t('instructor_profile_page.achievements.top_instructor_title')}</h4>
                          <p className="text-sm text-muted-foreground">{t('instructor_profile_page.achievements.top_instructor_description')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {section.type === 'testimonials' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {testimonials.map((testimonial) => (
                        <div key={testimonial.id} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={testimonial.avatar} />
                              <AvatarFallback>{testimonial.student[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{testimonial.student}</p>
                              <div className="flex">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{testimonial.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">{t('instructor_profile_page.testimonials.from_course', { course: testimonial.course })}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

          {/* Courses Section */}
          {profileSettings.showCourses && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {t('instructor_profile_page.courses.title')}
                </CardTitle>
                <CardDescription>{t('instructor_profile_page.courses.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <Input
                    className="md:col-span-2"
                    placeholder={t('instructor_profile_page.courses.search_placeholder')}
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                  <Select value={courseSortBy} onValueChange={setCourseSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('instructor_profile_page.courses.sort_by')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="students">{t('instructor_profile_page.courses.sort_options.students')}</SelectItem>
                      <SelectItem value="rating">{t('instructor_profile_page.courses.sort_options.rating')}</SelectItem>
                      <SelectItem value="price">{t('instructor_profile_page.courses.sort_options.price')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedCourses.map((course) => (
                    <div key={course.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-muted relative">
                        <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                        {course.bestseller && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500">
                            {t('instructor_profile_page.courses.bestseller')}
                          </Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{course.title}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{course.rating}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">({t('instructor_profile_page.preview.reviews_count', { count: course.reviews })})</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('instructor_profile_page.preview.students_count', { count: course.students.toLocaleString() })}</span>
                          <span className="font-bold">${course.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredCourses.length > 0 && (
                  <div className="mt-4">
                    <UserPagination
                      currentPage={coursePage}
                      totalPages={courseTotalPages}
                      onPageChange={setCoursePage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {canEditProfile && (
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('instructor_profile_page.settings.title')}</CardTitle>
                <CardDescription>{t('instructor_profile_page.settings.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">{t('instructor_profile_page.settings.show_biography')}</Label>
                    <p className="text-sm text-muted-foreground">{t('instructor_profile_page.settings.show_biography_description')}</p>
                  </div>
                  <Switch
                    checked={profileSettings.showBio}
                    onCheckedChange={(checked) => handleSettingChange('showBio', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">{t('instructor_profile_page.settings.show_teaching_statistics')}</Label>
                    <p className="text-sm text-muted-foreground">{t('instructor_profile_page.settings.show_teaching_statistics_description')}</p>
                  </div>
                  <Switch
                    checked={profileSettings.showStats}
                    onCheckedChange={(checked) => handleSettingChange('showStats', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">{t('instructor_profile_page.settings.show_courses')}</Label>
                    <p className="text-sm text-muted-foreground">{t('instructor_profile_page.settings.show_courses_description')}</p>
                  </div>
                  <Switch
                    checked={profileSettings.showCourses}
                    onCheckedChange={(checked) => handleSettingChange('showCourses', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">{t('instructor_profile_page.settings.show_social_links')}</Label>
                    <p className="text-sm text-muted-foreground">{t('instructor_profile_page.settings.show_social_links_description')}</p>
                  </div>
                  <Switch
                    checked={profileSettings.showSocialLinks}
                    onCheckedChange={(checked) => handleSettingChange('showSocialLinks', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canEditProfile && (
          <TabsContent value="customize" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{t('instructor_profile_page.customize.title')}</CardTitle>
                    <CardDescription>{t('instructor_profile_page.customize.description')}</CardDescription>
                  </div>
                  <Dialog open={isAddingSectionOpen} onOpenChange={setIsAddingSectionOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('instructor_profile_page.customize.add_section')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('instructor_profile_page.customize.dialog_title')}</DialogTitle>
                        <DialogDescription>{t('instructor_profile_page.customize.dialog_description')}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t('instructor_profile_page.customize.section_type')}</Label>
                          <Select value={newSection.type} onValueChange={(value) => setNewSection({...newSection, type: value as CustomSection['type']})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">{t('instructor_profile_page.customize.type_options.text')}</SelectItem>
                              <SelectItem value="achievements">{t('instructor_profile_page.customize.type_options.achievements')}</SelectItem>
                              <SelectItem value="testimonials">{t('instructor_profile_page.customize.type_options.testimonials')}</SelectItem>
                              <SelectItem value="gallery">{t('instructor_profile_page.customize.type_options.gallery')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>{t('instructor_profile_page.customize.section_title')}</Label>
                          <Input
                            placeholder={t('instructor_profile_page.customize.section_title_placeholder')}
                            value={newSection.title}
                            onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <Label>{t('instructor_profile_page.customize.content')}</Label>
                          <Textarea
                            placeholder={t('instructor_profile_page.customize.content_placeholder')}
                            value={newSection.content}
                            onChange={(e) => setNewSection({...newSection, content: e.target.value})}
                            rows={5}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="visible"
                            checked={newSection.visible}
                            onCheckedChange={(checked) => setNewSection({...newSection, visible: checked})}
                          />
                          <Label htmlFor="visible">{t('instructor_profile_page.customize.visible_on_profile')}</Label>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddingSectionOpen(false)}>
                            {t('instructor_profile_page.actions.cancel')}
                          </Button>
                          <Button onClick={handleAddSection}>
                            {t('instructor_profile_page.customize.add_section')}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profileSettings.customSections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('instructor_profile_page.customize.empty')}</p>
                    </div>
                  ) : (
                    profileSettings.customSections.map((section) => (
                      <div key={section.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{section.title}</h3>
                            <Badge variant="outline">{section.type}</Badge>
                            {!section.visible && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{section.content}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleToggleSectionVisibility(section.id)}>
                            {section.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteSection(section.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        </Tabs>
      </div>
    </div>
  )
}
