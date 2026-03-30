import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { ArrowLeft, ArrowRight, Save, Image as ImageIcon, Check, BookOpen, Settings, DollarSign, Users } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { toast } from 'sonner@2.0.3'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from "../../contexts/AuthContext"
import { createCourse } from "../../services/course.api"
import { getMyInstructorProfile } from "../../services/instructor.api"
import { getActiveCategories, getSubcategories, type Category } from "../../services/category.api"
import { uploadFiles } from "../../services/upload.api"

interface CourseData {
  title: string
  subtitle: string
  description: string
  category: string
  subcategory: string
  level: string
  language: string
  price: string
  thumbnail: string
  whatYouWillLearn: string[]
  requirements: string[]
  targetAudience: string[]
}

const initialData: CourseData = {
  title: '', subtitle: '', description: '', category: '', subcategory: '', level: '', language: 'Vietnamese',
  price: '', thumbnail: '', whatYouWillLearn: [''], requirements: [''], targetAudience: [''],
}

export function InstructorCreateCoursePage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<CourseData>(initialData)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [direction, setDirection] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  const [apiCategories, setApiCategories] = useState<Category[]>([])
  const [apiSubcategories, setApiSubcategories] = useState<Category[]>([])
  const [instructorId, setInstructorId] = useState<number | null>(null)

  useEffect(() => {
    getActiveCategories({ page_size: 100 })
      .then((res) => setApiCategories(res.results.filter((c) => c.parent_category === null)))
      .catch((err) => console.error('Failed to load categories:', err))
  }, [])

  useEffect(() => {
    if (!data.category) {
      setApiSubcategories([])
      return
    }
    const categoryId = Number(data.category)
    if (Number.isNaN(categoryId)) return
    getSubcategories(categoryId)
      .then((res) => setApiSubcategories(res.results))
      .catch((err) => console.error('Failed to load subcategories:', err))
  }, [data.category])

  useEffect(() => {
    if (!user?.id) return
    getMyInstructorProfile(user.id).then((profile) => setInstructorId(profile.id)).catch(console.error)
  }, [user?.id])

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100
  const steps = [
    { id: 1, title: t('instructor_create_course_page.steps.basic_info'), icon: BookOpen },
    { id: 2, title: t('instructor_create_course_page.steps.course_settings'), icon: Settings },
    { id: 3, title: t('instructor_create_course_page.steps.learning_content'), icon: Users },
    { id: 4, title: t('instructor_create_course_page.steps.pricing_media'), icon: DollarSign },
  ]
  const levelOptions = [
    { value: 'beginner', label: t('common.beginner') },
    { value: 'intermediate', label: t('common.intermediate') },
    { value: 'advanced', label: t('common.advanced') },
    { value: 'all_levels', label: t('common.all_levels') },
  ]
  const languageOptions = ['Vietnamese', 'English', 'Spanish', 'French', 'German', 'Chinese']

  const validateCurrentStep = () => {
    if (currentStep === 1 && !data.title.trim()) return toast.error(t('instructor_create_course_page.validation.title_required')), false
    if (currentStep === 1 && !data.description.trim()) return toast.error(t('instructor_create_course_page.validation.description_required')), false
    if (currentStep === 2 && !data.category) return toast.error(t('instructor_create_course_page.validation.category_required')), false
    if (currentStep === 2 && !data.level) return toast.error(t('instructor_create_course_page.validation.level_required')), false
    if (currentStep === 3 && data.whatYouWillLearn.filter((x) => x.trim()).length === 0) return toast.error(t('instructor_create_course_page.validation.learning_objective_required')), false
    if (currentStep === 4 && !data.price) return toast.error(t('instructor_create_course_page.validation.price_required')), false
    return true
  }

  const handleSubmit = async (saveStatus: 'draft' | 'submit_review') => {
    if (saveStatus === 'submit_review' && !validateCurrentStep()) return
    try {
      setIsSaving(true)
      const courseData: Record<string, any> = {
        title: data.title.trim(),
        shortdescription: data.subtitle.trim() || undefined,
        description: data.description.trim(),
        category: data.category ? Number(data.category) : null,
        subcategory: data.subcategory ? Number(data.subcategory) : null,
        level: data.level === 'all' ? 'all_levels' : (data.level || 'all_levels'),
        language: data.language || 'Vietnamese',
        price: parseFloat(data.price) || 0,
        thumbnail: data.thumbnail || undefined,
        learning_objectives: data.whatYouWillLearn.filter((x) => x.trim()),
        requirements: data.requirements.filter((x) => x.trim()).join('\n'),
        target_audience: data.targetAudience.filter((x) => x.trim()),
        status: saveStatus === 'submit_review' ? 'pending' : 'draft',
      }
      if (instructorId) courseData.instructor = instructorId
      await createCourse(courseData)
      toast.success(t(saveStatus === 'draft' ? 'instructor_create_course_page.toasts.saved_draft' : 'instructor_create_course_page.toasts.created_success'))
      setTimeout(() => navigate('/instructor/courses'), 1000)
    } catch (err: any) {
      console.error('Create course failed:', err)
      toast.error(err?.message || t('instructor_create_course_page.toasts.create_failed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return void toast.error(t('instructor_create_course_page.toasts.invalid_image_file'))
    if (file.size > 5 * 1024 * 1024) return void toast.error(t('instructor_create_course_page.toasts.image_too_large'))
    try {
      setIsUploadingThumbnail(true)
      const uploaded = await uploadFiles([file])
      if (!uploaded?.length) throw new Error('Upload failed')
      const uploadedUrl = uploaded[0].url
      setThumbnailPreview(uploadedUrl)
      setData((prev) => ({ ...prev, thumbnail: uploadedUrl }))
      toast.success(t('instructor_create_course_page.toasts.upload_success'))
    } catch (err) {
      console.error('Thumbnail upload failed:', err)
      toast.error(t('instructor_create_course_page.toasts.upload_failed'))
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  const addArrayItem = (field: 'whatYouWillLearn' | 'requirements' | 'targetAudience') => setData({ ...data, [field]: [...data[field], ''] })
  const removeArrayItem = (field: 'whatYouWillLearn' | 'requirements' | 'targetAudience', index: number) => {
    const next = data[field].filter((_, i) => i !== index)
    setData({ ...data, [field]: next.length > 0 ? next : [''] })
  }
  const updateArrayItem = (field: 'whatYouWillLearn' | 'requirements' | 'targetAudience', index: number, value: string) => {
    const next = [...data[field]]
    next[index] = value
    setData({ ...data, [field]: next })
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (d: number) => ({ zIndex: 0, x: d < 0 ? 1000 : -1000, opacity: 0 }),
  }

  const renderArrayField = (
    field: 'whatYouWillLearn' | 'requirements' | 'targetAudience',
    labelKey: string,
    hintKey: string,
    placeholderKey: string,
    addKey: string,
  ) => (
    <div>
      <Label>{t(labelKey)}</Label>
      <p className="text-sm text-muted-foreground mb-3">{t(hintKey)}</p>
      <div className="space-y-3">
        {data[field].map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input value={item} onChange={(e) => updateArrayItem(field, index, e.target.value)} placeholder={t(placeholderKey)} />
            {data[field].length > 1 && (
              <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(field, index)}>×</Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => addArrayItem(field)} className="w-full">{t(addKey)}</Button>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <Button variant="ghost" onClick={() => navigate('/instructor/courses')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />{t('instructor_create_course_page.back_to_courses')}
        </Button>
        <h1 className="mb-2">{t('instructor_create_course_page.title')}</h1>
        <p className="text-muted-foreground">{t('instructor_create_course_page.subtitle')}</p>
      </div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2>{t('instructor_create_course_page.step_counter', { current: currentStep, total: totalSteps })}</h2>
          <Badge variant="outline">{t('instructor_create_course_page.progress_complete', { percent: Math.round(progress) })}</Badge>
        </div>
        <Progress value={progress} className="h-3 mb-6" />
        <div className="flex justify-between">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.id} className="flex flex-col items-center max-w-[100px]">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all mb-2 ${currentStep >= step.id ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                  {currentStep > step.id ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span className="text-xs text-center text-muted-foreground hidden md:block">{step.title}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={currentStep} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}>
            {currentStep === 1 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{t('instructor_create_course_page.steps.basic_info')}</CardTitle>
                  <CardDescription>{t('instructor_create_course_page.basic_info.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="title">{t('instructor_create_course_page.basic_info.title_label')}</Label>
                    <Input id="title" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder={t('instructor_create_course_page.basic_info.title_placeholder')} className="mt-2" maxLength={100} />
                    <p className="text-xs text-muted-foreground mt-1">{t('instructor_create_course_page.characters_count', { current: data.title.length, max: 100 })}</p>
                  </div>
                  <div>
                    <Label htmlFor="subtitle">{t('instructor_create_course_page.basic_info.subtitle_label')}</Label>
                    <Input id="subtitle" value={data.subtitle} onChange={(e) => setData({ ...data, subtitle: e.target.value })} placeholder={t('instructor_create_course_page.basic_info.subtitle_placeholder')} className="mt-2" maxLength={120} />
                    <p className="text-xs text-muted-foreground mt-1">{t('instructor_create_course_page.characters_count', { current: data.subtitle.length, max: 120 })}</p>
                  </div>
                  <div>
                    <Label htmlFor="description">{t('instructor_create_course_page.basic_info.description_label')}</Label>
                    <Textarea id="description" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder={t('instructor_create_course_page.basic_info.description_placeholder')} rows={8} className="mt-2" maxLength={1000} />
                    <p className="text-xs text-muted-foreground mt-1">{t('instructor_create_course_page.characters_count', { current: data.description.length, max: 1000 })}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {currentStep === 2 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{t('instructor_create_course_page.steps.course_settings')}</CardTitle>
                  <CardDescription>{t('instructor_create_course_page.course_settings.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="category">{t('instructor_create_course_page.course_settings.category_label')}</Label>
                      <Select value={data.category} onValueChange={(value) => setData({ ...data, category: value, subcategory: '' })}>
                        <SelectTrigger id="category" className="mt-2"><SelectValue placeholder={t('instructor_create_course_page.course_settings.category_placeholder')} /></SelectTrigger>
                        <SelectContent>{apiCategories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="subcategory">{t('instructor_create_course_page.course_settings.subcategory_label')}</Label>
                      <Select value={data.subcategory} onValueChange={(value) => setData({ ...data, subcategory: value })} disabled={!data.category}>
                        <SelectTrigger id="subcategory" className="mt-2"><SelectValue placeholder={t('instructor_create_course_page.course_settings.subcategory_placeholder')} /></SelectTrigger>
                        <SelectContent>{apiSubcategories.map((subcategory) => <SelectItem key={subcategory.id} value={String(subcategory.id)}>{subcategory.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="level">{t('instructor_create_course_page.course_settings.level_label')}</Label>
                      <Select value={data.level} onValueChange={(value) => setData({ ...data, level: value })}>
                        <SelectTrigger id="level" className="mt-2"><SelectValue placeholder={t('instructor_create_course_page.course_settings.level_placeholder')} /></SelectTrigger>
                        <SelectContent>{levelOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="language">{t('instructor_create_course_page.course_settings.language_label')}</Label>
                      <Select value={data.language} onValueChange={(value) => setData({ ...data, language: value })}>
                        <SelectTrigger id="language" className="mt-2"><SelectValue placeholder={t('instructor_create_course_page.course_settings.language_placeholder')} /></SelectTrigger>
                        <SelectContent>{languageOptions.map((value) => <SelectItem key={value} value={value}>{t(`instructor_create_course_page.languages.${value.toLowerCase()}`)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {currentStep === 3 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{t('instructor_create_course_page.steps.learning_content')}</CardTitle>
                  <CardDescription>{t('instructor_create_course_page.learning_content.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {renderArrayField('whatYouWillLearn', 'instructor_create_course_page.learning_content.objectives_label', 'instructor_create_course_page.learning_content.objectives_hint', 'instructor_create_course_page.learning_content.objectives_placeholder', 'instructor_create_course_page.learning_content.add_objective')}
                  {renderArrayField('requirements', 'instructor_create_course_page.learning_content.requirements_label', 'instructor_create_course_page.learning_content.requirements_hint', 'instructor_create_course_page.learning_content.requirements_placeholder', 'instructor_create_course_page.learning_content.add_requirement')}
                  {renderArrayField('targetAudience', 'instructor_create_course_page.learning_content.audience_label', 'instructor_create_course_page.learning_content.audience_hint', 'instructor_create_course_page.learning_content.audience_placeholder', 'instructor_create_course_page.learning_content.add_audience')}
                </CardContent>
              </Card>
            )}
            {currentStep === 4 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{t('instructor_create_course_page.steps.pricing_media')}</CardTitle>
                  <CardDescription>{t('instructor_create_course_page.pricing_media.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="price">{t('instructor_create_course_page.pricing_media.price_label')}</Label>
                    <Input id="price" type="number" min="0" step="1000" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} placeholder="499000" className="mt-2" />
                    <p className="text-sm text-muted-foreground mt-1">{t('instructor_create_course_page.pricing_media.price_hint')}</p>
                  </div>
                  <div>
                    <Label>{t('instructor_create_course_page.pricing_media.thumbnail_label')}</Label>
                    <p className="text-sm text-muted-foreground mb-3">{t('instructor_create_course_page.pricing_media.thumbnail_hint')}</p>
                    {thumbnailPreview ? (
                      <div className="space-y-4">
                        <img src={thumbnailPreview} alt={t('instructor_create_course_page.pricing_media.thumbnail_alt')} className="w-full max-w-2xl rounded-lg shadow-md border" />
                        <label htmlFor="thumbnailInput" className="cursor-pointer">
                          <div className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">{t('instructor_create_course_page.pricing_media.change_image')}</div>
                          <input id="thumbnailInput" type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                        </label>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center hover:border-purple-400 transition-colors">
                        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <label htmlFor="thumbnailInput" className="cursor-pointer">
                          <div className="inline-block px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl">{t('instructor_create_course_page.pricing_media.choose_image')}</div>
                          <input id="thumbnailInput" type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                        </label>
                        <p className="text-sm text-muted-foreground mt-4">{t('instructor_create_course_page.pricing_media.drag_drop_hint')}</p>
                      </div>
                    )}
                    {isUploadingThumbnail && <p className="mt-4 text-sm text-muted-foreground">{t('instructor_create_course_page.pricing_media.uploading_image')}</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => { setDirection(-1); setCurrentStep((s) => Math.max(1, s - 1)) }} disabled={currentStep === 1} size="lg"><ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSubmit('draft')} size="lg" disabled={isSaving}><Save className="w-4 h-4 mr-2" />{isSaving ? t('instructor_create_course_page.actions.saving') : t('instructor_create_course_page.actions.save_draft')}</Button>
            {currentStep < totalSteps ? (
              <Button onClick={() => { if (!validateCurrentStep()) return; setDirection(1); setCurrentStep((s) => Math.min(totalSteps, s + 1)) }} className="bg-purple-600 hover:bg-purple-700" size="lg">{t('common.next')}<ArrowRight className="w-4 h-4 ml-2" /></Button>
            ) : (
              <Button onClick={() => handleSubmit('submit_review')} className="bg-green-600 hover:bg-green-700" size="lg" disabled={isSaving}><Check className="w-4 h-4 mr-2" />{isSaving ? t('instructor_create_course_page.actions.creating') : t('instructor_create_course_page.actions.create_course')}</Button>
            )}
          </div>
        </div>
        <Card className="bg-muted/50 mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">{t('instructor_create_course_page.next_steps.title')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• {t('instructor_create_course_page.next_steps.items.curriculum')}</li>
              <li>• {t('instructor_create_course_page.next_steps.items.media')}</li>
              <li>• {t('instructor_create_course_page.next_steps.items.pricing')}</li>
              <li>• {t('instructor_create_course_page.next_steps.items.review')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
