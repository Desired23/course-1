import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Input as AntInput, InputNumber, Progress as AntProgress, Select as AntSelect, Tag as AntTag } from 'antd'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { ArrowLeft, Save, Eye, Image as ImageIcon, Video, X, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { toast } from 'sonner'
import { useAuth } from "../../contexts/AuthContext"
import { getCourseById, createCourse, updateCourse } from "../../services/course.api"
import { getMyInstructorProfile } from "../../services/instructor.api"
import { getActiveCategories, getSubcategories, type Category } from "../../services/category.api"
import { uploadFileWithProgress } from "../../services/upload.api"

type Item = { id: number; text: string }
type Data = {
  title: string; subtitle: string; description: string; category: string; subcategory: string; language: string; level: string;
  learningObjectives: Item[]; requirements: Item[]; targetAudience: Item[]; courseImagePreview: string | null; promotionalVideoPreview: string | null;
  price: string; currency: string; tags: string[]
}
type CourseStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'archived'

const initialData: Data = { title: '', subtitle: '', description: '', category: '', subcategory: '', language: 'Vietnamese', level: '', learningObjectives: [], requirements: [], targetAudience: [], courseImagePreview: null, promotionalVideoPreview: null, price: '', currency: 'VND', tags: [] }
const getId = (value: unknown) => {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (typeof value !== 'object' || !value) return ''
  const record = value as Record<string, unknown>
  if (typeof record.id === 'number') return String(record.id)
  if (typeof record.category_id === 'number') return String(record.category_id)
  return ''
}
const normalizeTextArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
  return []
}
const normalizePrice = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value || ''))
  return Number.isFinite(numericValue) && numericValue > 0 ? String(numericValue) : ''
}
const normalizeLanguage = (value?: string | null) => ['english', 'japanese', 'chinese'].includes(value?.trim().toLowerCase() || '') ? value!.trim() : 'Vietnamese'
const levelOptions = [
  { value: 'all_levels', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

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

export function InstructorCourseLandingPage() {
  const { navigate, params } = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()
  const courseId = params?.courseId || 'new'
  const isCreatingCourse = courseId === 'new'
  const [data, setData] = useState<Data>(initialData)
  const [activeTab, setActiveTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)
  const [videoUploadProgress, setVideoUploadProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [currentCourseStatus, setCurrentCourseStatus] = useState<CourseStatus>('draft')
  const [newObjective, setNewObjective] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newAudience, setNewAudience] = useState('')
  const [newTag, setNewTag] = useState('')
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const isUploadingMedia = uploadingImage || uploadingVideo

  useEffect(() => { getActiveCategories({ page_size: 100 }).then((res) => setCategories(res.results.filter((c) => c.parent_category === null))).catch(console.error) }, [])
  useEffect(() => {
    if (!data.category) return void setSubcategories([])
    getSubcategories(Number(data.category)).then((res) => setSubcategories(res.results)).catch(console.error)
  }, [data.category])
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const profile = await getMyInstructorProfile(user.id)
        if (cancelled) return
        setInstructorId(profile.id)
        if (courseId !== 'new') {
          const course = await getCourseById(Number(courseId))
          if (cancelled) return
          setCurrentCourseStatus(course.status as CourseStatus)
          setData({
            title: course.title || '', subtitle: course.shortdescription || '', description: course.description || '',
            category: getId(course.category), subcategory: getId(course.subcategory), language: normalizeLanguage(course.language), level: course.level || '',
            learningObjectives: normalizeTextArray(course.learning_objectives).map((text, i) => ({ id: i + 1, text })),
            requirements: normalizeTextArray(course.requirements).map((text, i) => ({ id: i + 1, text })),
            targetAudience: normalizeTextArray(course.target_audience).map((text, i) => ({ id: i + 1, text })),
            courseImagePreview: course.thumbnail || null, promotionalVideoPreview: course.promotional_video || null, price: normalizePrice(course.price), currency: 'VND', tags: normalizeTextArray(course.tags),
          })
        }
      } catch (err) {
        console.error(err)
        toast.error(t('instructor_course_landing_page.toasts.load_failed'))
      }
    })()
    return () => { cancelled = true }
  }, [courseId, t, user?.id])

  const addItem = (key: 'learningObjectives' | 'requirements' | 'targetAudience', value: string, setValue: (v: string) => void, errorKey: string) => {
    if (!value.trim()) return void toast.error(t(errorKey))
    setData((prev) => ({ ...prev, [key]: [...prev[key], { id: Date.now(), text: value }] }))
    setValue('')
  }
  const removeItem = (key: 'learningObjectives' | 'requirements' | 'targetAudience', id: number) => setData((prev) => ({ ...prev, [key]: prev[key].filter((item) => item.id !== id) }))
  const addTag = () => {
    if (!newTag.trim()) return void toast.error(t('instructor_course_landing_page.toasts.tag_required'))
    if (data.tags.includes(newTag)) return void toast.error(t('instructor_course_landing_page.toasts.tag_exists'))
    if (data.tags.length >= 10) return void toast.error(t('instructor_course_landing_page.toasts.tag_limit'))
    setData((prev) => ({ ...prev, tags: [...prev.tags, newTag] })); setNewTag('')
  }
  const uploadAsset = async (file: File, kind: 'image' | 'video') => {
    if (kind === 'image' && !file.type.startsWith('image/')) return void toast.error(t('instructor_course_landing_page.toasts.invalid_image_file'))
    if (kind === 'video' && !file.type.startsWith('video/')) return void toast.error(t('instructor_course_landing_page.toasts.invalid_video_file'))
    if (kind === 'image' && file.size > 5 * 1024 * 1024) return void toast.error(t('instructor_course_landing_page.toasts.image_too_large'))
    if (kind === 'video' && file.size > 200 * 1024 * 1024) return void toast.error(t('instructor_course_landing_page.toasts.video_too_large'))
    if (kind === 'image') setUploadingImage(true)
    if (kind === 'video') setUploadingVideo(true)
    if (kind === 'image') setImageUploadProgress(0)
    if (kind === 'video') setVideoUploadProgress(0)
    try {
      const uploaded = await uploadFileWithProgress(file, { resource_type: kind }, kind === 'image' ? setImageUploadProgress : setVideoUploadProgress)
      const url = uploaded.url
      setData((prev) => ({ ...prev, ...(kind === 'image' ? { courseImagePreview: url } : { promotionalVideoPreview: url }) }))
      toast.success(t(kind === 'image' ? 'instructor_course_landing_page.toasts.upload_image_success' : 'instructor_course_landing_page.toasts.upload_video_success'))
    } catch (err) {
      console.error(err)
      toast.error(t(kind === 'image' ? 'instructor_course_landing_page.toasts.upload_image_failed' : 'instructor_course_landing_page.toasts.upload_video_failed'))
    } finally {
      if (kind === 'image') setUploadingImage(false)
      if (kind === 'video') setUploadingVideo(false)
      setTimeout(() => {
        if (kind === 'image') setImageUploadProgress(0)
        if (kind === 'video') setVideoUploadProgress(0)
      }, 900)
    }
  }
  const save = async (status: 'draft' | 'submit_review') => {
    if (isUploadingMedia) return void (toast.error(t('instructor_course_landing_page.toasts.video_uploading')), setActiveTab('media'))
    if (!data.title.trim()) return void (toast.error(t('instructor_course_landing_page.toasts.title_required')), setActiveTab('basic'))
    if (!data.subtitle.trim()) return void (toast.error(t('instructor_course_landing_page.toasts.subtitle_required')), setActiveTab('basic'))
    if (!data.description.trim()) return void (toast.error(t('instructor_course_landing_page.toasts.description_required')), setActiveTab('basic'))
    if (!data.category) return void (toast.error(t('instructor_course_landing_page.toasts.category_required')), setActiveTab('basic'))
    if (!data.courseImagePreview) return void (toast.error(t('instructor_course_landing_page.toasts.image_required')), setActiveTab('media'))
    try {
      setSaving(true)
      const nextStatus =
        isCreatingCourse
          ? 'draft'
          : currentCourseStatus === 'draft' || currentCourseStatus === 'rejected'
            ? status === 'submit_review' ? 'pending' : 'draft'
            : currentCourseStatus
      const payload: Record<string, any> = {
        title: data.title.trim(), shortdescription: data.subtitle.trim(), description: data.description.trim(), category: Number(data.category), subcategory: data.subcategory ? Number(data.subcategory) : null,
        level: data.level || 'all_levels', language: data.language || 'Vietnamese', price: data.price ? Number(data.price) : 0, thumbnail: data.courseImagePreview || null, promotional_video: data.promotionalVideoPreview || null,
        learning_objectives: data.learningObjectives.map((x) => x.text), requirements: data.requirements.map((x) => x.text).join('\n'), target_audience: data.targetAudience.map((x) => x.text), tags: data.tags, status: nextStatus,
      }
      if (isCreatingCourse) { if (instructorId) payload.instructor = instructorId; await createCourse(payload) } else { await updateCourse(Number(courseId), payload) }
      setCurrentCourseStatus(nextStatus as CourseStatus)
      const toastKey = nextStatus === 'pending'
        ? 'instructor_course_landing_page.toasts.submitted_review'
        : nextStatus === 'draft'
          ? 'instructor_course_landing_page.toasts.saved_draft'
          : 'instructor_course_landing_page.toasts.saved_changes'
      toast.success(t(toastKey))
      setTimeout(() => navigate('/instructor/courses'), 1000)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || t('instructor_course_landing_page.toasts.save_failed'))
    } finally { setSaving(false) }
  }

  const completion = Math.round(([
    Boolean(data.title), Boolean(data.description && data.description.length >= 200), data.learningObjectives.length > 0, Boolean(data.courseImagePreview),
  ].filter(Boolean).length / 4) * 100)

  const renderItemList = (items: Item[], remove: (id: number) => void, icon = false) => items.length > 0 && <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">{icon && <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />}<span className="text-sm flex-1">{item.text}</span><Button variant="ghost" size="sm" onClick={() => remove(item.id)}><X className="h-4 w-4" /></Button></div>)}</div>

  return (
    <motion.div
      className="container mx-auto px-4 py-6 md:py-8 max-w-7xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-6 md:mb-8" variants={fadeInUp}>
        <Button variant="ghost" onClick={() => navigate('/instructor/courses')} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.back_to_courses')}</Button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="mb-2">{t('instructor_course_landing_page.title')}</h1><p className="text-muted-foreground">{t('instructor_course_landing_page.subtitle')}</p></div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end"><span className="text-sm text-muted-foreground">{t('instructor_course_landing_page.completion_label')}</span><div className="flex items-center gap-2"><Progress value={completion} className="w-24 h-2" /><span className="text-sm">{completion}%</span></div></div>
            <Button variant="outline" onClick={() => courseId !== 'new' && window.open(`/course/${courseId}`, '_blank')} disabled={courseId === 'new'}><Eye className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.preview')}</Button>
            <Button onClick={() => save(isCreatingCourse ? 'draft' : 'submit_review')} disabled={saving || isUploadingMedia}><Save className="h-4 w-4 mr-2" />{isCreatingCourse ? t('instructor_course_landing_page.save_draft') : t('instructor_course_landing_page.save_publish')}</Button>
          </div>
        </div>
      </motion.div>

      <motion.div className="mb-6 flex gap-2 flex-wrap" variants={fadeInUp}>
        <Badge variant={data.title ? "default" : "outline"} className="gap-1">{data.title ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.title')}</Badge>
        <Badge variant={data.description && data.description.length >= 200 ? "default" : "outline"} className="gap-1">{data.description && data.description.length >= 200 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.description')}</Badge>
        <Badge variant={data.learningObjectives.length > 0 ? "default" : "outline"} className="gap-1">{data.learningObjectives.length > 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.objectives', { count: data.learningObjectives.length })}</Badge>
        <Badge variant={data.courseImagePreview ? "default" : "outline"} className="gap-1">{data.courseImagePreview ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.course_image')}</Badge>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="relative grid w-full grid-cols-4 p-1">
          <TabsTrigger value="basic" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'basic' && <motion.span layoutId="instructor-course-landing-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('instructor_course_landing_page.tabs.basic')}</span>
          </TabsTrigger>
          <TabsTrigger value="target" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'target' && <motion.span layoutId="instructor-course-landing-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('instructor_course_landing_page.tabs.target')}</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'media' && <motion.span layoutId="instructor-course-landing-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('instructor_course_landing_page.tabs.media')}</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'pricing' && <motion.span layoutId="instructor-course-landing-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('instructor_course_landing_page.tabs.pricing')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.basic.title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.basic.description')}</CardDescription></CardHeader><CardContent className="space-y-4">
            <div><label htmlFor="title" className="text-sm font-medium">{t('instructor_course_landing_page.basic.course_title')}</label><AntInput id="title" className="mt-2" placeholder={t('instructor_course_landing_page.basic.course_title_placeholder')} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} maxLength={60} showCount /><p className="text-xs text-muted-foreground mt-1">{t('instructor_course_landing_page.basic.title_hint', { count: data.title.length })}</p></div>
            <div><label htmlFor="subtitle" className="text-sm font-medium">{t('instructor_course_landing_page.basic.subtitle')}</label><AntInput id="subtitle" className="mt-2" placeholder={t('instructor_course_landing_page.basic.subtitle_placeholder')} value={data.subtitle} onChange={(e) => setData({ ...data, subtitle: e.target.value })} maxLength={120} showCount /><p className="text-xs text-muted-foreground mt-1">{t('instructor_course_landing_page.basic.subtitle_hint', { count: data.subtitle.length })}</p></div>
            <div><label htmlFor="description" className="text-sm font-medium">{t('instructor_course_landing_page.basic.course_description')}</label><AntInput.TextArea id="description" className="mt-2" placeholder={t('instructor_course_landing_page.basic.course_description_placeholder')} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={8} showCount /><p className="text-xs text-muted-foreground mt-1">{t('instructor_course_landing_page.basic.description_hint', { count: data.description.length })}</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">{t('instructor_course_landing_page.basic.category')}</label><AntSelect className="mt-2 w-full" value={data.category || undefined} placeholder={t('instructor_course_landing_page.basic.category_placeholder')} onChange={(value) => setData({ ...data, category: value, subcategory: '' })} options={categories.map((c) => ({ value: String(c.id), label: c.name }))} /></div>
              <div><label className="text-sm font-medium">{t('instructor_course_landing_page.basic.subcategory')}</label><AntSelect className="mt-2 w-full" value={data.subcategory || undefined} placeholder={t('instructor_course_landing_page.basic.subcategory_placeholder')} onChange={(value) => setData({ ...data, subcategory: value })} disabled={!data.category} options={subcategories.map((c) => ({ value: String(c.id), label: c.name }))} /></div>
              <div><label className="text-sm font-medium">{t('instructor_course_landing_page.basic.level')}</label><AntSelect className="mt-2 w-full" value={data.level || undefined} placeholder={t('instructor_course_landing_page.basic.level_placeholder')} onChange={(value) => setData({ ...data, level: value })} options={levelOptions} /></div>
              <div><label className="text-sm font-medium">{t('instructor_course_landing_page.basic.language')}</label><AntSelect className="mt-2 w-full" value={data.language || undefined} onChange={(value) => setData({ ...data, language: value })} options={[{ value: 'Vietnamese', label: t('instructor_course_landing_page.languages.vietnamese') }, { value: 'English', label: t('instructor_course_landing_page.languages.english') }, { value: 'Japanese', label: t('instructor_course_landing_page.languages.japanese') }, { value: 'Chinese', label: t('instructor_course_landing_page.languages.chinese') }]} /></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="target" className="space-y-6">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.target.objectives_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.target.objectives_description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><AntInput placeholder={t('instructor_course_landing_page.target.objectives_placeholder')} value={newObjective} onChange={(e) => setNewObjective(e.target.value)} onPressEnter={() => addItem('learningObjectives', newObjective, setNewObjective, 'instructor_course_landing_page.toasts.objective_required')} /><Button onClick={() => addItem('learningObjectives', newObjective, setNewObjective, 'instructor_course_landing_page.toasts.objective_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.learningObjectives, (id) => removeItem('learningObjectives', id), true)}</CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.target.requirements_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.target.requirements_description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><AntInput placeholder={t('instructor_course_landing_page.target.requirements_placeholder')} value={newRequirement} onChange={(e) => setNewRequirement(e.target.value)} onPressEnter={() => addItem('requirements', newRequirement, setNewRequirement, 'instructor_course_landing_page.toasts.requirement_required')} /><Button onClick={() => addItem('requirements', newRequirement, setNewRequirement, 'instructor_course_landing_page.toasts.requirement_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.requirements, (id) => removeItem('requirements', id))}</CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.target.audience_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.target.audience_description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><AntInput placeholder={t('instructor_course_landing_page.target.audience_placeholder')} value={newAudience} onChange={(e) => setNewAudience(e.target.value)} onPressEnter={() => addItem('targetAudience', newAudience, setNewAudience, 'instructor_course_landing_page.toasts.audience_required')} /><Button onClick={() => addItem('targetAudience', newAudience, setNewAudience, 'instructor_course_landing_page.toasts.audience_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.targetAudience, (id) => removeItem('targetAudience', id))}</CardContent></Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.media.image_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.media.image_description')}</CardDescription></CardHeader><CardContent className="space-y-4">{data.courseImagePreview ? <div className="relative w-full max-w-2xl aspect-video overflow-hidden rounded-lg border bg-muted"><img src={data.courseImagePreview} alt={t('instructor_course_landing_page.media.course_thumbnail_alt')} className="h-full w-full object-cover" /><Button variant="destructive" size="sm" className="absolute top-2 right-2" disabled={uploadingImage} onClick={() => setData({ ...data, courseImagePreview: null })}><Trash2 className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.media.remove_image')}</Button></div> : <div className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${uploadingImage ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-primary'}`} onClick={() => !uploadingImage && imageRef.current?.click()}><ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="mb-2">{uploadingImage ? t('instructor_course_landing_page.media.uploading_image') : t('instructor_course_landing_page.media.image_dropzone')}</p><p className="text-sm text-muted-foreground">{t('instructor_course_landing_page.media.image_formats')}</p></div>}{uploadingImage && <div className="max-w-2xl"><AntProgress percent={imageUploadProgress} size="small" /></div>}<input ref={imageRef} type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], 'image')} /></CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.media.video_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.media.video_description')}</CardDescription></CardHeader><CardContent className="space-y-4">{data.promotionalVideoPreview ? <div className="relative"><video src={data.promotionalVideoPreview} controls className="w-full max-w-2xl rounded-lg border" /><Button variant="destructive" size="sm" className="absolute top-2 right-2" disabled={uploadingVideo} onClick={() => setData({ ...data, promotionalVideoPreview: null })}><Trash2 className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.media.remove_video')}</Button></div> : <div className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${uploadingVideo ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-primary'}`} onClick={() => !uploadingVideo && videoRef.current?.click()}><Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="mb-2">{uploadingVideo ? t('instructor_course_landing_page.media.uploading_video') : t('instructor_course_landing_page.media.video_dropzone')}</p><p className="text-sm text-muted-foreground">{t('instructor_course_landing_page.media.video_formats')}</p></div>}{uploadingVideo && <div className="max-w-2xl"><AntProgress percent={videoUploadProgress} size="small" /></div>}<input ref={videoRef} type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], 'video')} /><p className="text-sm p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">{t('instructor_course_landing_page.media.video_tip')}</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.pricing.title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.pricing.description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="col-span-2"><label className="text-sm font-medium">{t('instructor_course_landing_page.pricing.price_label')}</label><InputNumber className="mt-2 w-full" min={0} step={1000} placeholder="499000" value={data.price ? Number(data.price) : null} onChange={(value) => setData({ ...data, price: value === null ? '' : String(value) })} /></div><div><label className="text-sm font-medium">{t('instructor_course_landing_page.pricing.currency_label')}</label><AntSelect className="mt-2 w-full" value={data.currency} onChange={(value) => setData({ ...data, currency: value })} options={[{ value: 'VND', label: t('instructor_course_landing_page.pricing.vnd') }]} /></div></div><div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200"><p className="text-sm mb-2"><strong>{t('instructor_course_landing_page.pricing.suggestions_title')}</strong></p><ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground"><li>{t('instructor_course_landing_page.pricing.short_course')}</li><li>{t('instructor_course_landing_page.pricing.medium_course')}</li><li>{t('instructor_course_landing_page.pricing.long_course')}</li></ul></div></CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.tags.title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.tags.description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><AntInput placeholder={t('instructor_course_landing_page.tags.placeholder')} value={newTag} onChange={(e) => setNewTag(e.target.value)} onPressEnter={addTag} /><Button onClick={addTag} disabled={data.tags.length >= 10}><Plus className="h-4 w-4" /></Button></div>{data.tags.length > 0 && <div className="flex flex-wrap gap-2">{data.tags.map((tag) => <AntTag key={tag} closable onClose={(event) => { event.preventDefault(); setData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) })) }}>{tag}</AntTag>)}</div>}<p className="text-sm text-muted-foreground">{t('instructor_course_landing_page.tags.count', { count: data.tags.length })}</p></CardContent></Card>
        </TabsContent>
      </Tabs>
      </motion.div>

      <motion.div className="flex justify-between items-center pt-6 border-t" variants={fadeInUp}>
        <Button variant="outline" onClick={() => save('draft')} disabled={saving || isUploadingMedia}>{saving ? t('instructor_course_landing_page.saving') : t('instructor_course_landing_page.save_draft')}</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => courseId !== 'new' && window.open(`/course/${courseId}`, '_blank')} disabled={courseId === 'new'}><Eye className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.preview')}</Button>
          {!isCreatingCourse && (
            <Button onClick={() => save('submit_review')} disabled={saving || isUploadingMedia}><Save className="h-4 w-4 mr-2" />{saving ? t('instructor_course_landing_page.saving') : t('instructor_course_landing_page.save_publish')}</Button>
          )}
        </div>
      </motion.div>
      </motion.div>
    </motion.div>
  )
}
