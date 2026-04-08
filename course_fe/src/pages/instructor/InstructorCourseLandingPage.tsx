import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { ArrowLeft, Save, Eye, Image as ImageIcon, Video, X, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { toast } from 'sonner@2.0.3'
import { useAuth } from "../../contexts/AuthContext"
import { getCourseById, createCourse, updateCourse } from "../../services/course.api"
import { getMyInstructorProfile } from "../../services/instructor.api"
import { getActiveCategories, getSubcategories, type Category } from "../../services/category.api"
import { uploadFiles } from "../../services/upload.api"

type Item = { id: number; text: string }
type Data = {
  title: string; subtitle: string; description: string; category: string; subcategory: string; language: string; level: string;
  learningObjectives: Item[]; requirements: Item[]; targetAudience: Item[]; skillsTaught: Item[]; prerequisites: Item[]; courseImagePreview: string | null; promotionalVideoPreview: string | null;
  price: string; currency: string; tags: string[]
}

const initialData: Data = { title: '', subtitle: '', description: '', category: '', subcategory: '', language: 'Vietnamese', level: '', learningObjectives: [], requirements: [], targetAudience: [], skillsTaught: [], prerequisites: [], courseImagePreview: null, promotionalVideoPreview: null, price: '', currency: 'VND', tags: [] }
const getId = (value: unknown) => typeof value === 'number' ? String(value) : typeof value === 'object' && value && typeof (value as Record<string, unknown>).id === 'number' ? String((value as Record<string, number>).id) : ''
const normalizeLanguage = (value?: string | null) => ['english', 'japanese', 'chinese'].includes(value?.trim().toLowerCase() || '') ? value!.trim() : 'Vietnamese'
const levelOptions = [
  { value: 'all_levels', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export function InstructorCourseLandingPage() {
  const { navigate, params } = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()
  const courseId = params?.courseId || 'new'
  const [data, setData] = useState<Data>(initialData)
  const [activeTab, setActiveTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [newObjective, setNewObjective] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newAudience, setNewAudience] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [newPrerequisite, setNewPrerequisite] = useState('')
  const [newTag, setNewTag] = useState('')
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

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
          setData({
            title: course.title || '', subtitle: course.shortdescription || '', description: course.description || '',
            category: getId(course.category), subcategory: getId(course.subcategory), language: normalizeLanguage(course.language), level: course.level || '',
            learningObjectives: (course.learning_objectives || []).map((text: string, i: number) => ({ id: i + 1, text })),
            requirements: course.requirements ? course.requirements.split('\n').filter(Boolean).map((text: string, i: number) => ({ id: i + 1, text })) : [],
            targetAudience: (course.target_audience || []).map((text: string, i: number) => ({ id: i + 1, text })),
            skillsTaught: (course.skills_taught || []).map((text: string, i: number) => ({ id: i + 1, text })),
            prerequisites: (course.prerequisites || []).map((text: string, i: number) => ({ id: i + 1, text })),
            courseImagePreview: course.thumbnail || null, promotionalVideoPreview: course.promotional_video || null, price: course.price ? String(parseFloat(course.price)) : '', currency: 'VND', tags: course.tags || [],
          })
        }
      } catch (err) {
        console.error(err)
        toast.error(t('instructor_course_landing_page.toasts.load_failed'))
      }
    })()
    return () => { cancelled = true }
  }, [courseId, t, user?.id])

  const addItem = (key: 'learningObjectives' | 'requirements' | 'targetAudience' | 'skillsTaught' | 'prerequisites', value: string, setValue: (v: string) => void, errorKey: string) => {
    if (!value.trim()) return void toast.error(t(errorKey))
    setData((prev) => ({ ...prev, [key]: [...prev[key], { id: Date.now(), text: value }] }))
    setValue('')
  }
  const removeItem = (key: 'learningObjectives' | 'requirements' | 'targetAudience' | 'skillsTaught' | 'prerequisites', id: number) => setData((prev) => ({ ...prev, [key]: prev[key].filter((item) => item.id !== id) }))
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
    try {
      const uploaded = await uploadFiles([file]); if (!uploaded?.length) throw new Error('Upload failed')
      const url = uploaded[0].url
      setData((prev) => ({ ...prev, ...(kind === 'image' ? { courseImagePreview: url } : { promotionalVideoPreview: url }) }))
      toast.success(t(kind === 'image' ? 'instructor_course_landing_page.toasts.upload_image_success' : 'instructor_course_landing_page.toasts.upload_video_success'))
    } catch (err) {
      console.error(err)
      toast.error(t(kind === 'image' ? 'instructor_course_landing_page.toasts.upload_image_failed' : 'instructor_course_landing_page.toasts.upload_video_failed'))
    }
  }
  const save = async (status: 'draft' | 'submit_review') => {
    if (!data.title.trim()) return void (toast.error(t('instructor_course_landing_page.toasts.title_required')), setActiveTab('basic'))
    if (!data.subtitle.trim()) return void (toast.error(t('instructor_course_landing_page.toasts.subtitle_required')), setActiveTab('basic'))
    if (!data.description.trim()) return void (toast.error(t('instructor_course_landing_page.toasts.description_required')), setActiveTab('basic'))
    if (!data.category) return void (toast.error(t('instructor_course_landing_page.toasts.category_required')), setActiveTab('basic'))
    if (data.learningObjectives.length < 4) return void (toast.error(t('instructor_course_landing_page.toasts.objectives_min')), setActiveTab('target'))
    if (!data.courseImagePreview) return void (toast.error(t('instructor_course_landing_page.toasts.image_required')), setActiveTab('media'))
    try {
      setSaving(true)
      const payload: Record<string, any> = {
        title: data.title.trim(), shortdescription: data.subtitle.trim(), description: data.description.trim(), category: Number(data.category), subcategory: data.subcategory ? Number(data.subcategory) : null,
        level: data.level || 'all_levels', language: data.language || 'Vietnamese', price: data.price ? Number(data.price) : 0, thumbnail: data.courseImagePreview || null, promotional_video: data.promotionalVideoPreview || null,
        learning_objectives: data.learningObjectives.map((x) => x.text), requirements: data.requirements.map((x) => x.text).join('\n'), target_audience: data.targetAudience.map((x) => x.text), skills_taught: data.skillsTaught.map((x) => x.text), prerequisites: data.prerequisites.map((x) => x.text), tags: data.tags, status: status === 'submit_review' ? 'pending' : 'draft',
      }
      if (courseId === 'new') { if (instructorId) payload.instructor = instructorId; await createCourse(payload) } else { await updateCourse(Number(courseId), payload) }
      toast.success(t(status === 'draft' ? 'instructor_course_landing_page.toasts.saved_draft' : 'instructor_course_landing_page.toasts.published_success'))
      setTimeout(() => navigate('/instructor/courses'), 1000)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || t('instructor_course_landing_page.toasts.save_failed'))
    } finally { setSaving(false) }
  }

  const completion = Math.round(([
    Boolean(data.title), Boolean(data.description && data.description.length >= 200), data.learningObjectives.length >= 4, Boolean(data.courseImagePreview),
  ].filter(Boolean).length / 4) * 100)

  const renderItemList = (items: Item[], remove: (id: number) => void, icon = false) => items.length > 0 && <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">{icon && <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />}<span className="text-sm flex-1">{item.text}</span><Button variant="ghost" size="sm" onClick={() => remove(item.id)}><X className="h-4 w-4" /></Button></div>)}</div>

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      <div className="mb-6 md:mb-8">
        <Button variant="ghost" onClick={() => navigate('/instructor/courses')} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.back_to_courses')}</Button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="mb-2">{t('instructor_course_landing_page.title')}</h1><p className="text-muted-foreground">{t('instructor_course_landing_page.subtitle')}</p></div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end"><span className="text-sm text-muted-foreground">{t('instructor_course_landing_page.completion_label')}</span><div className="flex items-center gap-2"><Progress value={completion} className="w-24 h-2" /><span className="text-sm">{completion}%</span></div></div>
            <Button variant="outline" onClick={() => setShowPreview(true)}><Eye className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.preview')}</Button>
            <Button onClick={() => save('submit_review')}><Save className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.save_publish')}</Button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <Badge variant={data.title ? "default" : "outline"} className="gap-1">{data.title ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.title')}</Badge>
        <Badge variant={data.description && data.description.length >= 200 ? "default" : "outline"} className="gap-1">{data.description && data.description.length >= 200 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.description')}</Badge>
        <Badge variant={data.learningObjectives.length >= 4 ? "default" : "outline"} className="gap-1">{data.learningObjectives.length >= 4 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.objectives', { count: data.learningObjectives.length })}</Badge>
        <Badge variant={data.courseImagePreview ? "default" : "outline"} className="gap-1">{data.courseImagePreview ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{t('instructor_course_landing_page.checks.course_image')}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">{t('instructor_course_landing_page.tabs.basic')}</TabsTrigger>
          <TabsTrigger value="target">{t('instructor_course_landing_page.tabs.target')}</TabsTrigger>
          <TabsTrigger value="media">{t('instructor_course_landing_page.tabs.media')}</TabsTrigger>
          <TabsTrigger value="pricing">{t('instructor_course_landing_page.tabs.pricing')}</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.basic.title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.basic.description')}</CardDescription></CardHeader><CardContent className="space-y-4">
            <div><Label htmlFor="title">{t('instructor_course_landing_page.basic.course_title')}</Label><Input id="title" placeholder={t('instructor_course_landing_page.basic.course_title_placeholder')} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} maxLength={60} /><p className="text-xs text-muted-foreground mt-1">{t('instructor_course_landing_page.basic.title_hint', { count: data.title.length })}</p></div>
            <div><Label htmlFor="subtitle">{t('instructor_course_landing_page.basic.subtitle')}</Label><Input id="subtitle" placeholder={t('instructor_course_landing_page.basic.subtitle_placeholder')} value={data.subtitle} onChange={(e) => setData({ ...data, subtitle: e.target.value })} maxLength={120} /><p className="text-xs text-muted-foreground mt-1">{t('instructor_course_landing_page.basic.subtitle_hint', { count: data.subtitle.length })}</p></div>
            <div><Label htmlFor="description">{t('instructor_course_landing_page.basic.course_description')}</Label><Textarea id="description" placeholder={t('instructor_course_landing_page.basic.course_description_placeholder')} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={8} /><p className="text-xs text-muted-foreground mt-1">{t('instructor_course_landing_page.basic.description_hint', { count: data.description.length })}</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>{t('instructor_course_landing_page.basic.category')}</Label><Select value={data.category} onValueChange={(value) => setData({ ...data, category: value, subcategory: '' })}><SelectTrigger><SelectValue placeholder={t('instructor_course_landing_page.basic.category_placeholder')} /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('instructor_course_landing_page.basic.subcategory')}</Label><Select value={data.subcategory} onValueChange={(value) => setData({ ...data, subcategory: value })} disabled={!data.category}><SelectTrigger><SelectValue placeholder={t('instructor_course_landing_page.basic.subcategory_placeholder')} /></SelectTrigger><SelectContent>{subcategories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('instructor_course_landing_page.basic.level')}</Label><Select value={data.level} onValueChange={(value) => setData({ ...data, level: value })}><SelectTrigger><SelectValue placeholder={t('instructor_course_landing_page.basic.level_placeholder')} /></SelectTrigger><SelectContent>{levelOptions.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('instructor_course_landing_page.basic.language')}</Label><Select value={data.language} onValueChange={(value) => setData({ ...data, language: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Vietnamese">{t('instructor_course_landing_page.languages.vietnamese')}</SelectItem><SelectItem value="English">{t('instructor_course_landing_page.languages.english')}</SelectItem><SelectItem value="Japanese">{t('instructor_course_landing_page.languages.japanese')}</SelectItem><SelectItem value="Chinese">{t('instructor_course_landing_page.languages.chinese')}</SelectItem></SelectContent></Select></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="target" className="space-y-6">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.target.objectives_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.target.objectives_description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input placeholder={t('instructor_course_landing_page.target.objectives_placeholder')} value={newObjective} onChange={(e) => setNewObjective(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem('learningObjectives', newObjective, setNewObjective, 'instructor_course_landing_page.toasts.objective_required')} /><Button onClick={() => addItem('learningObjectives', newObjective, setNewObjective, 'instructor_course_landing_page.toasts.objective_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.learningObjectives, (id) => removeItem('learningObjectives', id), true)}{data.learningObjectives.length < 4 && <p className="text-sm text-amber-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{t('instructor_course_landing_page.target.objectives_remaining', { count: 4 - data.learningObjectives.length })}</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.target.requirements_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.target.requirements_description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input placeholder={t('instructor_course_landing_page.target.requirements_placeholder')} value={newRequirement} onChange={(e) => setNewRequirement(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem('requirements', newRequirement, setNewRequirement, 'instructor_course_landing_page.toasts.requirement_required')} /><Button onClick={() => addItem('requirements', newRequirement, setNewRequirement, 'instructor_course_landing_page.toasts.requirement_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.requirements, (id) => removeItem('requirements', id))}</CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.target.audience_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.target.audience_description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input placeholder={t('instructor_course_landing_page.target.audience_placeholder')} value={newAudience} onChange={(e) => setNewAudience(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem('targetAudience', newAudience, setNewAudience, 'instructor_course_landing_page.toasts.audience_required')} /><Button onClick={() => addItem('targetAudience', newAudience, setNewAudience, 'instructor_course_landing_page.toasts.audience_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.targetAudience, (id) => removeItem('targetAudience', id))}</CardContent></Card>
          <Card><CardHeader><CardTitle>Catalog skills_taught</CardTitle><CardDescription>Cac skill AI co the dung de map lo trinh va giai thich tai sao khoa hoc can thiet.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input placeholder="Vi du: SQL joins, Pandas cleaning, dashboard storytelling" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem('skillsTaught', newSkill, setNewSkill, 'instructor_course_landing_page.toasts.requirement_required')} /><Button onClick={() => addItem('skillsTaught', newSkill, setNewSkill, 'instructor_course_landing_page.toasts.requirement_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.skillsTaught, (id) => removeItem('skillsTaught', id))}</CardContent></Card>
          <Card><CardHeader><CardTitle>Catalog prerequisites</CardTitle><CardDescription>Nhap nhung kien thuc dau vao de advisor co the danh dau is_skippable hoac sap thu tu hoc.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input placeholder="Vi du: Excel co ban, tu duy logic, da tung viet Python" value={newPrerequisite} onChange={(e) => setNewPrerequisite(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem('prerequisites', newPrerequisite, setNewPrerequisite, 'instructor_course_landing_page.toasts.requirement_required')} /><Button onClick={() => addItem('prerequisites', newPrerequisite, setNewPrerequisite, 'instructor_course_landing_page.toasts.requirement_required')}><Plus className="h-4 w-4" /></Button></div>{renderItemList(data.prerequisites, (id) => removeItem('prerequisites', id))}</CardContent></Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.media.image_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.media.image_description')}</CardDescription></CardHeader><CardContent className="space-y-4">{data.courseImagePreview ? <div className="relative"><img src={data.courseImagePreview} alt={t('instructor_course_landing_page.media.course_thumbnail_alt')} className="w-full max-w-2xl rounded-lg border" /><Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setData({ ...data, courseImagePreview: null })}><Trash2 className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.media.remove_image')}</Button></div> : <div className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => imageRef.current?.click()}><ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="mb-2">{t('instructor_course_landing_page.media.image_dropzone')}</p><p className="text-sm text-muted-foreground">{t('instructor_course_landing_page.media.image_formats')}</p></div>}<input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], 'image')} /></CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.media.video_title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.media.video_description')}</CardDescription></CardHeader><CardContent className="space-y-4">{data.promotionalVideoPreview ? <div className="relative"><video src={data.promotionalVideoPreview} controls className="w-full max-w-2xl rounded-lg border" /><Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setData({ ...data, promotionalVideoPreview: null })}><Trash2 className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.media.remove_video')}</Button></div> : <div className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => videoRef.current?.click()}><Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="mb-2">{t('instructor_course_landing_page.media.video_dropzone')}</p><p className="text-sm text-muted-foreground">{t('instructor_course_landing_page.media.video_formats')}</p></div>}<input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], 'video')} /><p className="text-sm p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">{t('instructor_course_landing_page.media.video_tip')}</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.pricing.title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.pricing.description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="col-span-2"><Label>{t('instructor_course_landing_page.pricing.price_label')}</Label><Input type="number" placeholder="499000" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} /></div><div><Label>{t('instructor_course_landing_page.pricing.currency_label')}</Label><Select value={data.currency} onValueChange={(value) => setData({ ...data, currency: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="VND">{t('instructor_course_landing_page.pricing.vnd')}</SelectItem><SelectItem value="USD">{t('instructor_course_landing_page.pricing.usd')}</SelectItem><SelectItem value="EUR">{t('instructor_course_landing_page.pricing.eur')}</SelectItem></SelectContent></Select></div></div><div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200"><p className="text-sm mb-2"><strong>{t('instructor_course_landing_page.pricing.suggestions_title')}</strong></p><ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground"><li>{t('instructor_course_landing_page.pricing.short_course')}</li><li>{t('instructor_course_landing_page.pricing.medium_course')}</li><li>{t('instructor_course_landing_page.pricing.long_course')}</li></ul></div></CardContent></Card>
          <Card><CardHeader><CardTitle>{t('instructor_course_landing_page.tags.title')}</CardTitle><CardDescription>{t('instructor_course_landing_page.tags.description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input placeholder={t('instructor_course_landing_page.tags.placeholder')} value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTag()} /><Button onClick={addTag} disabled={data.tags.length >= 10}><Plus className="h-4 w-4" /></Button></div>{data.tags.length > 0 && <div className="flex flex-wrap gap-2">{data.tags.map((tag) => <Badge key={tag} variant="secondary" className="gap-2">{tag}<X className="w-3 h-3 cursor-pointer" onClick={() => setData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))} /></Badge>)}</div>}<p className="text-sm text-muted-foreground">{t('instructor_course_landing_page.tags.count', { count: data.tags.length })}</p></CardContent></Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={() => save('draft')} disabled={saving}>{saving ? t('instructor_course_landing_page.saving') : t('instructor_course_landing_page.save_draft')}</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowPreview(true)}><Eye className="h-4 w-4 mr-2" />{t('instructor_course_landing_page.preview')}</Button>
          <Button onClick={() => save('submit_review')} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? t('instructor_course_landing_page.saving') : t('instructor_course_landing_page.save_publish')}</Button>
        </div>
      </div>
    </div>
  )
}
