import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
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
import { UserPagination } from '../../components/UserPagination'
import {
  Edit,
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
  Trophy,
  Target,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getMyInstructorProfile,
  getInstructorDashboardStats,
  updateInstructorProfile,
  type Instructor,
  type InstructorProfileSettings,
  type InstructorCustomSection,
} from '../../services/instructor.api'
import { getAllCourses } from '../../services/course.api'
import { getAllReviewsByInstructor } from '../../services/review.api'
import { uploadFiles } from '../../services/upload.api'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

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

const DEFAULT_SETTINGS: InstructorProfileSettings = {
  showCourses: true,
  showStats: true,
  showBio: true,
  showSocialLinks: true,
  customSections: [],
}

interface InstructorStats {
  totalStudents: number
  totalCourses: number
  averageRating: number
  totalReviews: number
  coursesCompleted: number
  totalHours: number
}

type SectionDraft = {
  title: string
  content: string
  type: InstructorCustomSection['type']
  visible: boolean
  images: string[]
}

const EMPTY_SECTION: SectionDraft = { title: '', content: '', type: 'text', visible: true, images: [] }

function formatContentHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

export function InstructorProfilePage() {
  const { user, hasPermission } = useAuth()
  const { t } = useTranslation()

  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [profileSettings, setProfileSettings] = useState<InstructorProfileSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState('preview')

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [editForm, setEditForm] = useState({
    bio: '',
    specialization: '',
    qualification: '',
    experience: '',
    website: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    facebook: '',
  })

  const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [sectionDraft, setSectionDraft] = useState<SectionDraft>(EMPTY_SECTION)
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  const [stats, setStats] = useState<InstructorStats>({
    totalStudents: 0, totalCourses: 0, averageRating: 0, totalReviews: 0, coursesCompleted: 0, totalHours: 0,
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
        setInstructor(profile)
        setProfileSettings({ ...DEFAULT_SETTINGS, ...(profile.profile_settings || {}) })

        try {
          const dashStats = await getInstructorDashboardStats(profile.id)
          if (cancelled) return
          setStats({
            totalStudents: dashStats.total_students,
            totalCourses: dashStats.total_courses,
            averageRating: dashStats.average_rating,
            totalReviews: dashStats.total_reviews,
            coursesCompleted: 0,
            totalHours: dashStats.total_content_hours,
          })
        } catch (err) {
          console.error('Failed to load instructor dashboard stats:', err)
        }

        try {
          const courses = await getAllCourses({ instructor_id: profile.id })
          if (cancelled) return
          setInstructorCourses(courses.map(c => ({
            id: c.id,
            title: c.title,
            students: c.total_students || 0,
            rating: parseFloat(String(c.rating || 0)),
            reviews: 0,
            image: c.thumbnail || '',
            price: parseFloat(String(c.price || 0)),
            bestseller: false,
          })))
        } catch (err) {
          console.error('Failed to load instructor courses:', err)
        }

        try {
          const reviews = await getAllReviewsByInstructor(profile.id)
          if (cancelled) return
          setTestimonials(reviews.slice(0, 5).map(r => ({
            id: r.review_id,
            student: r.user_info?.full_name || t('instructor_profile_page.fallbacks.student'),
            avatar: r.user_info?.avatar || '',
            content: r.comment || '',
            rating: r.rating,
            course: r.course_detail?.title || t('instructor_profile_page.fallbacks.course'),
          })))
        } catch (err) {
          console.error('Failed to load instructor reviews:', err)
        }
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

  const socialLinks = instructor?.social_links || {}

  const openEditDialog = () => {
    const links = instructor?.social_links || {}
    setEditForm({
      bio: instructor?.bio || '',
      specialization: instructor?.specialization || '',
      qualification: instructor?.qualification || '',
      experience: instructor?.experience != null ? String(instructor.experience) : '',
      website: links.website || '',
      twitter: links.twitter || '',
      linkedin: links.linkedin || '',
      youtube: links.youtube || '',
      facebook: links.facebook || '',
    })
    setIsEditOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!instructor) return
    setIsSavingProfile(true)
    const social_links: Record<string, string> = {}
    if (editForm.website) social_links.website = editForm.website
    if (editForm.twitter) social_links.twitter = editForm.twitter
    if (editForm.linkedin) social_links.linkedin = editForm.linkedin
    if (editForm.youtube) social_links.youtube = editForm.youtube
    if (editForm.facebook) social_links.facebook = editForm.facebook

    const payload = {
      bio: editForm.bio,
      specialization: editForm.specialization,
      qualification: editForm.qualification,
      experience: editForm.experience ? Number(editForm.experience) : null,
      social_links,
    }
    try {
      const updated = await updateInstructorProfile(instructor.id, payload as any)
      setInstructor(updated)
      setIsEditOpen(false)
      toast.success(t('instructor_profile_page.toasts.profile_saved'))
    } catch (err) {
      console.error('Failed to save profile:', err)
      toast.error(t('instructor_profile_page.toasts.save_failed'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const persistSettings = async (next: InstructorProfileSettings) => {
    if (!instructor) return
    const prev = profileSettings
    setProfileSettings(next)
    try {
      await updateInstructorProfile(instructor.id, { profile_settings: next })
    } catch (err) {
      console.error('Failed to save settings:', err)
      setProfileSettings(prev)
      toast.error(t('instructor_profile_page.toasts.save_failed'))
    }
  }

  const handleSettingChange = (setting: keyof InstructorProfileSettings, value: boolean) => {
    persistSettings({ ...profileSettings, [setting]: value })
  }

  const openAddSection = () => {
    setEditingSectionId(null)
    setSectionDraft(EMPTY_SECTION)
    setIsAddingSectionOpen(true)
  }

  const openEditSection = (section: InstructorCustomSection) => {
    setEditingSectionId(section.id)
    setSectionDraft({
      title: section.title,
      content: section.content,
      type: section.type,
      visible: section.visible,
      images: section.images || [],
    })
    setIsAddingSectionOpen(true)
  }

  const handleSaveSection = () => {
    if (isUploadingImages) return
    if (!sectionDraft.title.trim()) return
    let updatedSections: InstructorCustomSection[]
    if (editingSectionId) {
      updatedSections = profileSettings.customSections.map(s =>
        s.id === editingSectionId
          ? { ...s, title: sectionDraft.title, content: sectionDraft.content, type: sectionDraft.type, visible: sectionDraft.visible, images: sectionDraft.images }
          : s
      )
    } else {
      const section: InstructorCustomSection = {
        id: Date.now().toString(),
        title: sectionDraft.title,
        content: sectionDraft.content,
        type: sectionDraft.type,
        visible: sectionDraft.visible,
        images: sectionDraft.images,
        order: profileSettings.customSections.length + 1,
      }
      updatedSections = [...profileSettings.customSections, section]
    }
    persistSettings({ ...profileSettings, customSections: updatedSections })
    setIsAddingSectionOpen(false)
    setEditingSectionId(null)
    setSectionDraft(EMPTY_SECTION)
  }

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = profileSettings.customSections.filter(s => s.id !== sectionId)
    persistSettings({ ...profileSettings, customSections: updatedSections })
  }

  const handleToggleSectionVisibility = (sectionId: string) => {
    const updatedSections = profileSettings.customSections.map(s =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    )
    persistSettings({ ...profileSettings, customSections: updatedSections })
  }

  const handleSectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setIsUploadingImages(true)
    try {
      const uploaded = await uploadFiles(files, { folder: 'instructor-gallery', resource_type: 'image' })
      setSectionDraft(prev => ({ ...prev, images: [...prev.images, ...uploaded.map(u => u.url)] }))
    } catch (err) {
      console.error('Failed to upload gallery images:', err)
      toast.error(t('instructor_profile_page.toasts.upload_failed'))
    } finally {
      setIsUploadingImages(false)
      e.target.value = ''
    }
  }

  const removeDraftImage = (url: string) => {
    setSectionDraft(prev => ({ ...prev, images: prev.images.filter(i => i !== url) }))
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
    <motion.div className="p-6" variants={sectionStagger} initial="hidden" animate="show">
      <div className="container mx-auto space-y-6">
        <motion.div className="flex justify-between items-center" variants={fadeInUp}>
          <div>
            <h1 className="text-3xl font-bold">{t('instructor_profile_page.title')}</h1>
            <p className="text-muted-foreground">{t('instructor_profile_page.subtitle')}</p>
          </div>
          {canEditProfile && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => instructor && window.open(`/instructor/${instructor.id}/profile`, '_blank')} disabled={!instructor}>
                <Eye className="h-4 w-4 mr-2" />
                {t('instructor_profile_page.actions.view_public_profile')}
              </Button>
              <Button onClick={openEditDialog} disabled={!instructor}>
                <Edit className="h-4 w-4 mr-2" />
                {t('instructor_profile_page.actions.edit_profile')}
              </Button>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="relative p-1">
            <TabsTrigger value="preview" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {activeTab === 'preview' && <motion.span layoutId="instructor-profile-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
              <span className="relative z-10">{t('instructor_profile_page.tabs.preview')}</span>
            </TabsTrigger>
            {canEditProfile && (
              <TabsTrigger value="settings" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {activeTab === 'settings' && <motion.span layoutId="instructor-profile-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                <span className="relative z-10">{t('instructor_profile_page.tabs.settings')}</span>
              </TabsTrigger>
            )}
            {canEditProfile && (
              <TabsTrigger value="customize" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {activeTab === 'customize' && <motion.span layoutId="instructor-profile-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                <span className="relative z-10">{t('instructor_profile_page.tabs.customize')}</span>
              </TabsTrigger>
            )}
          </TabsList>

        <TabsContent value="preview" className="space-y-6">

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
                    <p className="text-xl text-muted-foreground">
                      {instructor?.specialization || t('instructor_profile_page.preview.professional_title')}
                    </p>

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

                  {profileSettings.showBio && instructor?.bio && (
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {instructor.bio}
                      </p>
                    </div>
                  )}

                  {profileSettings.showSocialLinks && (
                    <div className="flex items-center gap-4 flex-wrap">
                      {socialLinks.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={socialLinks.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.website')}
                          </a>
                        </Button>
                      )}
                      {socialLinks.twitter && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                            <Twitter className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.twitter')}
                          </a>
                        </Button>
                      )}
                      {socialLinks.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.linkedin')}
                          </a>
                        </Button>
                      )}
                      {socialLinks.youtube && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                            <Youtube className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.youtube')}
                          </a>
                        </Button>
                      )}
                      {socialLinks.facebook && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                            <Facebook className="h-4 w-4 mr-2" />
                            {t('instructor_profile_page.social.facebook')}
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


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
                    <div className="text-3xl font-bold text-purple-600">{formatContentHours(stats.totalHours)}h</div>
                    <div className="text-sm text-muted-foreground">{t('instructor_profile_page.stats.content_hours')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


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
                          <p className="text-sm text-muted-foreground">{section.content || t('instructor_profile_page.achievements.top_instructor_description')}</p>
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
                  {section.type === 'gallery' && (
                    <>
                      {section.content && <p className="mb-3 text-sm text-muted-foreground whitespace-pre-wrap">{section.content}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(section.images || []).map((url, i) => (
                          <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}


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
                          <span className="font-bold">{course.price.toLocaleString('vi-VN')}₫</span>
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
                  <Button onClick={openAddSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('instructor_profile_page.customize.add_section')}
                  </Button>
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
                          <Button size="sm" variant="outline" onClick={() => openEditSection(section)}>
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
        </motion.div>
      </div>

      {/* Edit profile dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('instructor_profile_page.edit.dialog_title')}</DialogTitle>
            <DialogDescription>{t('instructor_profile_page.edit.dialog_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('instructor_profile_page.edit.bio')}</Label>
              <Textarea
                rows={4}
                placeholder={t('instructor_profile_page.edit.bio_placeholder')}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('instructor_profile_page.edit.specialization')}</Label>
                <Input
                  placeholder={t('instructor_profile_page.edit.specialization_placeholder')}
                  value={editForm.specialization}
                  onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('instructor_profile_page.edit.experience')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.experience}
                  onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t('instructor_profile_page.edit.qualification')}</Label>
              <Input
                placeholder={t('instructor_profile_page.edit.qualification_placeholder')}
                value={editForm.qualification}
                onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base">{t('instructor_profile_page.edit.social_links')}</Label>
              {([
                ['website', Globe, t('instructor_profile_page.social.website')],
                ['twitter', Twitter, t('instructor_profile_page.social.twitter')],
                ['linkedin', Linkedin, t('instructor_profile_page.social.linkedin')],
                ['youtube', Youtube, t('instructor_profile_page.social.youtube')],
                ['facebook', Facebook, t('instructor_profile_page.social.facebook')],
              ] as const).map(([key, Icon, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder={`${label} — ${t('instructor_profile_page.edit.url_placeholder')}`}
                    value={(editForm as any)[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                {t('instructor_profile_page.actions.cancel')}
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? t('instructor_profile_page.edit.saving') : t('instructor_profile_page.edit.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / edit custom section dialog */}
      <Dialog open={isAddingSectionOpen} onOpenChange={setIsAddingSectionOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSectionId
                ? t('instructor_profile_page.customize.dialog_title_edit')
                : t('instructor_profile_page.customize.dialog_title')}
            </DialogTitle>
            <DialogDescription>{t('instructor_profile_page.customize.dialog_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('instructor_profile_page.customize.section_type')}</Label>
              <Select value={sectionDraft.type} onValueChange={(value) => setSectionDraft({ ...sectionDraft, type: value as InstructorCustomSection['type'] })}>
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
                value={sectionDraft.title}
                onChange={(e) => setSectionDraft({ ...sectionDraft, title: e.target.value })}
              />
            </div>

            <div>
              <Label>{t('instructor_profile_page.customize.content')}</Label>
              <Textarea
                placeholder={t('instructor_profile_page.customize.content_placeholder')}
                value={sectionDraft.content}
                onChange={(e) => setSectionDraft({ ...sectionDraft, content: e.target.value })}
                rows={4}
              />
            </div>

            {sectionDraft.type === 'gallery' && (
              <div>
                <Label>{t('instructor_profile_page.customize.gallery_images')}</Label>
                <div className="mt-2">
                  <input
                    id="gallery-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleSectionImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingImages}
                    onClick={() => document.getElementById('gallery-upload')?.click()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isUploadingImages
                      ? t('instructor_profile_page.customize.uploading')
                      : t('instructor_profile_page.customize.add_images')}
                  </Button>
                </div>
                {sectionDraft.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {sectionDraft.images.map((url) => (
                      <div key={url} className="relative group">
                        <img src={url} alt="" className="w-full h-20 object-cover rounded-md" />
                        <button
                          type="button"
                          onClick={() => removeDraftImage(url)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="section-visible"
                checked={sectionDraft.visible}
                onCheckedChange={(checked) => setSectionDraft({ ...sectionDraft, visible: checked })}
              />
              <Label htmlFor="section-visible">{t('instructor_profile_page.customize.visible_on_profile')}</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingSectionOpen(false)}>
                {t('instructor_profile_page.actions.cancel')}
              </Button>
              <Button onClick={handleSaveSection} disabled={!sectionDraft.title.trim() || isUploadingImages}>
                {editingSectionId
                  ? t('instructor_profile_page.customize.save_section')
                  : t('instructor_profile_page.customize.add_section')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
