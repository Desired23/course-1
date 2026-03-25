import { useState, useRef, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Separator } from "../../components/ui/separator"
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Image as ImageIcon, 
  Video, 
  X, 
  Plus,
  Trash2,
  Play,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useRouter } from "../../components/Router"
import { toast } from 'sonner@2.0.3'
import { useAuth } from "../../contexts/AuthContext"
import { getCourseById, createCourse, updateCourse } from "../../services/course.api"
import { getMyInstructorProfile } from "../../services/instructor.api"
import { getActiveCategories, getSubcategories, type Category } from "../../services/category.api"
import { uploadFiles } from "../../services/upload.api"

interface LearningObjective {
  id: number
  text: string
}

interface Requirement {
  id: number
  text: string
}

interface TargetAudience {
  id: number
  text: string
}

interface CourseLandingData {
  // Basic Info
  title: string
  subtitle: string
  description: string
  category: string
  subcategory: string
  topic: string
  language: string
  level: string
  
  // Target Audience
  learningObjectives: LearningObjective[]
  requirements: Requirement[]
  targetAudience: TargetAudience[]
  
  // Media
  courseImage: File | null
  courseImagePreview: string | null
  promotionalVideo: File | null
  promotionalVideoPreview: string | null
  
  // Pricing
  price: string
  currency: string
  
  // Tags
  tags: string[]
}

const initialData: CourseLandingData = {
  title: '',
  subtitle: '',
  description: '',
  category: '',
  subcategory: '',
  topic: '',
  language: 'Vietnamese',
  level: '',
  learningObjectives: [],
  requirements: [],
  targetAudience: [],
  courseImage: null,
  courseImagePreview: null,
  promotionalVideo: null,
  promotionalVideoPreview: null,
  price: '',
  currency: 'VND',
  tags: []
}

const levelOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all_levels', label: 'All Levels' },
]

function getCategoryValue(category: unknown): string {
  if (category == null) return ''
  if (typeof category === 'number') return String(category)
  if (typeof category === 'object') {
    const categoryObj = category as Record<string, unknown>
    if (typeof categoryObj.id === 'number') return String(categoryObj.id)
    if (typeof categoryObj.category_id === 'number') return String(categoryObj.category_id)
  }
  return ''
}

function normalizeCourseLanguage(language?: string | null): string {
  if (!language) return 'Vietnamese'
  const normalized = language.trim().toLowerCase()
  if (['vietnamese', 'tiếng việt', 'tieng viet'].includes(normalized)) return 'Vietnamese'
  if (normalized === 'english') return 'English'
  if (normalized === 'japanese') return 'Japanese'
  if (normalized === 'chinese') return 'Chinese'
  return 'Vietnamese'
}

export function InstructorCourseLandingPage() {
  const { navigate, params } = useRouter()
  const { user } = useAuth()
  const courseId = params?.courseId || 'new'
  
  const [data, setData] = useState<CourseLandingData>(initialData)
  const [activeTab, setActiveTab] = useState('basic')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  
  // API-fetched categories  
  const [apiCategories, setApiCategories] = useState<Category[]>([])
  const [apiSubcategories, setApiSubcategories] = useState<Category[]>([])
  const [instructorId, setInstructorId] = useState<number | null>(null)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [newObjective, setNewObjective] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newAudience, setNewAudience] = useState('')
  const [newTag, setNewTag] = useState('')

  // Fetch categories from API
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await getActiveCategories({ page_size: 100 })
        setApiCategories(res.results.filter(c => c.parent_category === null))
      } catch (err) {
        console.error('Failed to load categories:', err)
      }
    }
    loadCategories()
  }, [])

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!data.category) {
      setApiSubcategories([])
      return
    }
    async function loadSubs() {
      try {
        const catId = Number(data.category)
        if (isNaN(catId)) return
        const res = await getSubcategories(catId)
        setApiSubcategories(res.results)
      } catch (err) {
        console.error('Failed to load subcategories:', err)
      }
    }
    loadSubs()
  }, [data.category])

  // Fetch instructor profile + existing course data
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function loadData() {
      try {
        setIsLoadingData(true)
        const profile = await getMyInstructorProfile(user!.id)
        if (cancelled) return
        setInstructorId(profile.id)

        // If editing existing course, load its data
        if (courseId !== 'new') {
          const course = await getCourseById(Number(courseId))
          if (cancelled) return
          const catId = getCategoryValue(course.category)
          const subCatId = getCategoryValue(course.subcategory)
          setData({
            title: course.title || '',
            subtitle: course.shortdescription || '',
            description: course.description || '',
            category: catId,
            subcategory: subCatId,
            topic: '',
            language: normalizeCourseLanguage(course.language),
            level: course.level || '',
            learningObjectives: (course.learning_objectives || []).map((text: string, i: number) => ({ id: i + 1, text })),
            requirements: course.requirements
              ? course.requirements.split('\n').filter(Boolean).map((text: string, i: number) => ({ id: i + 1, text }))
              : [],
            targetAudience: (course.target_audience || []).map((text: string, i: number) => ({ id: i + 1, text })),
            courseImage: null,
            courseImagePreview: course.thumbnail || null,
            promotionalVideo: null,
            promotionalVideoPreview: course.promotional_video || null,
            price: course.price ? String(parseFloat(course.price)) : '',
            currency: 'VND',
            tags: course.tags || [],
          })
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        toast.error('Failed to load course data')
      } finally {
        if (!cancelled) setIsLoadingData(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [user?.id, courseId])

  // Subcategories are now fetched from API in useEffect above

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be <= 5MB')
        return
      }
      
      try {
        setIsUploadingImage(true)
        const uploaded = await uploadFiles([file])
        if (!uploaded?.length) throw new Error('Upload failed')
        const uploadedUrl = uploaded[0].url

        setData((prev) => ({ 
          ...prev, 
          courseImage: file, 
          courseImagePreview: uploadedUrl 
        }))
        toast.success('Upload image successfully')
      } catch (err) {
        console.error('Image upload failed:', err)
        toast.error('Upload image failed')
      } finally {
        setIsUploadingImage(false)
      }
    }
  }
  // Handle video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast.error('Please choose a valid video file')
        return
      }
      
      // Validate file size (max 200MB)
      if (file.size > 200 * 1024 * 1024) {
        toast.error('Video size must be <= 200MB')
        return
      }
      
      try {
        setIsUploadingVideo(true)
        const uploaded = await uploadFiles([file])
        if (!uploaded?.length) throw new Error('Upload failed')
        const uploadedUrl = uploaded[0].url

        setData((prev) => ({ 
          ...prev, 
          promotionalVideo: file, 
          promotionalVideoPreview: uploadedUrl 
        }))
        toast.success('Upload video successfully')
      } catch (err) {
        console.error('Video upload failed:', err)
        toast.error('Upload video failed')
      } finally {
        setIsUploadingVideo(false)
      }
    }
  }
  // Add learning objective
  const addLearningObjective = () => {
    if (!newObjective.trim()) {
      toast.error('Vui lòng nhập mục tiêu học tập')
      return
    }
    
    setData({
      ...data,
      learningObjectives: [
        ...data.learningObjectives,
        { id: Date.now(), text: newObjective }
      ]
    })
    setNewObjective('')
  }

  // Remove learning objective
  const removeLearningObjective = (id: number) => {
    setData({
      ...data,
      learningObjectives: data.learningObjectives.filter(obj => obj.id !== id)
    })
  }

  // Add requirement
  const addRequirement = () => {
    if (!newRequirement.trim()) {
      toast.error('Vui lòng nhập yêu cầu')
      return
    }
    
    setData({
      ...data,
      requirements: [
        ...data.requirements,
        { id: Date.now(), text: newRequirement }
      ]
    })
    setNewRequirement('')
  }

  // Remove requirement
  const removeRequirement = (id: number) => {
    setData({
      ...data,
      requirements: data.requirements.filter(req => req.id !== id)
    })
  }

  // Add target audience
  const addTargetAudience = () => {
    if (!newAudience.trim()) {
      toast.error('Vui lòng nhập đối tượng học viên')
      return
    }
    
    setData({
      ...data,
      targetAudience: [
        ...data.targetAudience,
        { id: Date.now(), text: newAudience }
      ]
    })
    setNewAudience('')
  }

  // Remove target audience
  const removeTargetAudience = (id: number) => {
    setData({
      ...data,
      targetAudience: data.targetAudience.filter(aud => aud.id !== id)
    })
  }

  // Add tag
  const addTag = () => {
    if (!newTag.trim()) {
      toast.error('Vui lòng nhập tag')
      return
    }
    
    if (data.tags.includes(newTag)) {
      toast.error('Tag đã tồn tại')
      return
    }
    
    if (data.tags.length >= 10) {
      toast.error('Tối đa 10 tags')
      return
    }
    
    setData({
      ...data,
      tags: [...data.tags, newTag]
    })
    setNewTag('')
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setData({
      ...data,
      tags: data.tags.filter(t => t !== tag)
    })
  }

  // Handle save
  const handleSave = async (saveStatus: 'draft' | 'submit_review') => {
    // Validation
    if (!data.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề khóa học')
      setActiveTab('basic')
      return
    }
    
    if (!data.subtitle.trim()) {
      toast.error('Vui lòng nhập phụ đề')
      setActiveTab('basic')
      return
    }
    
    if (!data.description.trim()) {
      toast.error('Vui lòng nhập mô tả khóa học')
      setActiveTab('basic')
      return
    }
    
    if (!data.category) {
      toast.error('Vui lòng chọn danh mục')
      setActiveTab('basic')
      return
    }
    
    if (data.learningObjectives.length < 4) {
      toast.error('Vui lòng thêm ít nhất 4 mục tiêu học tập')
      setActiveTab('target')
      return
    }
    
    if (!data.courseImagePreview) {
      toast.error('Vui lòng tải lên ảnh khóa học')
      setActiveTab('media')
      return
    }

    try {
      setIsSaving(true)
      const courseData: Record<string, any> = {
        title: data.title.trim(),
        shortdescription: data.subtitle.trim(),
        description: data.description.trim(),
        category: data.category ? Number(data.category) : null,
        subcategory: data.subcategory ? Number(data.subcategory) : null,
        level: data.level || 'all_levels',
        language: data.language || 'Vietnamese',
        price: data.price ? Number(data.price) : 0,
        thumbnail: data.courseImagePreview || null,
        promotional_video: data.promotionalVideoPreview || null,
        learning_objectives: data.learningObjectives.map(o => o.text),
        requirements: data.requirements.map(r => r.text).join('\n'),
        target_audience: data.targetAudience.map(a => a.text),
        tags: data.tags,
        status: saveStatus === 'submit_review' ? 'pending' : 'draft',
      }

      if (courseId === 'new') {
        // Create new course
        if (instructorId) courseData.instructor = instructorId
        await createCourse(courseData)
      } else {
        // Update existing course
        await updateCourse(Number(courseId), courseData)
      }

      if (saveStatus === 'draft') {
        toast.success('Đã lưu bản nháp thành công!')
      } else {
        toast.success('Đã xuất bản khóa học thành công!')
      }

      setTimeout(() => {
        navigate('/instructor/courses')
      }, 1000)
    } catch (err: any) {
      console.error('Save course failed:', err)
      toast.error(err?.message || 'Lưu khóa học thất bại')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate completion percentage
  const calculateCompletion = () => {
    let completed = 0
    let total = 10
    
    if (data.title) completed++
    if (data.subtitle) completed++
    if (data.description && data.description.length >= 200) completed++
    if (data.category) completed++
    if (data.level) completed++
    if (data.learningObjectives.length >= 4) completed++
    if (data.requirements.length >= 1) completed++
    if (data.targetAudience.length >= 1) completed++
    if (data.courseImagePreview) completed++
    if (data.price) completed++
    
    return Math.round((completed / total) * 100)
  }

  const completion = calculateCompletion()

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button variant="ghost" onClick={() => navigate('/instructor/courses')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại khóa học của tôi
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="mb-2">Trang đích khóa học</h1>
            <p className="text-muted-foreground">
              Tạo trang đích hấp dẫn để thu hút học viên đăng ký khóa học của bạn
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm text-muted-foreground">Hoàn thành</span>
              <div className="flex items-center gap-2">
                <Progress value={completion} className="w-24 h-2" />
                <span className="text-sm">{completion}%</span>
              </div>
            </div>
            
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Xem trước
            </Button>
            
            <Button onClick={() => handleSave('submit_review')}>
              <Save className="h-4 w-4 mr-2" />
              Lưu & Xuất bản
            </Button>
          </div>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <Badge variant={data.title ? "default" : "outline"} className="gap-1">
            {data.title ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            Tiêu đề
          </Badge>
          <Badge variant={data.description && data.description.length >= 200 ? "default" : "outline"} className="gap-1">
            {data.description && data.description.length >= 200 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            Mô tả
          </Badge>
          <Badge variant={data.learningObjectives.length >= 4 ? "default" : "outline"} className="gap-1">
            {data.learningObjectives.length >= 4 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            Mục tiêu ({data.learningObjectives.length}/4)
          </Badge>
          <Badge variant={data.courseImagePreview ? "default" : "outline"} className="gap-1">
            {data.courseImagePreview ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            Ảnh khóa học
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
          <TabsTrigger value="target">Đối tượng học viên</TabsTrigger>
          <TabsTrigger value="media">Media & Assets</TabsTrigger>
          <TabsTrigger value="pricing">Giá & Tags</TabsTrigger>
        </TabsList>

        {/* Tab 1: Basic Info */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin khóa học</CardTitle>
              <CardDescription>
                Nhập thông tin cơ bản về khóa học của bạn. Tiêu đề và mô tả rõ ràng sẽ giúp học viên dễ dàng tìm thấy khóa học.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Tiêu đề khóa học *</Label>
                <Input
                  id="title"
                  placeholder="VD: The Complete JavaScript Course 2024: From Zero to Expert!"
                  value={data.title}
                  onChange={(e) => setData({ ...data, title: e.target.value })}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.title.length}/60 ký tự. Tiêu đề ngắn gọn, hấp dẫn và chứa từ khóa quan trọng.
                </p>
              </div>

              <div>
                <Label htmlFor="subtitle">Phụ đề *</Label>
                <Input
                  id="subtitle"
                  placeholder="VD: Master JavaScript with the most complete course! Projects, challenges, quizzes, ES6+, OOP, AJAX, Webpack"
                  value={data.subtitle}
                  onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.subtitle.length}/120 ký tự. Mô tả ngắn gọn những gì học viên sẽ học được.
                </p>
              </div>

              <div>
                <Label htmlFor="description">Mô tả khóa học *</Label>
                <Textarea
                  id="description"
                  placeholder="Viết mô tả chi tiết về khóa học của bạn. Bao gồm những gì học viên sẽ học được, tại sao khóa học này quan trọng, và bạn có gì đặc biệt so với các khóa học khác..."
                  value={data.description}
                  onChange={(e) => setData({ ...data, description: e.target.value })}
                  rows={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.description.length} ký tự. Tối thiểu 200 ký tự. Mô tả chi tiết giúp tăng tỷ lệ chuyển đổi.
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Danh mục *</Label>
                  <Select value={data.category} onValueChange={(value) => setData({ ...data, category: value, subcategory: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiCategories.map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subcategory">Danh mục con</Label>
                  <Select 
                    value={data.subcategory} 
                    onValueChange={(value) => setData({ ...data, subcategory: value })}
                    disabled={!data.category}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục con" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiSubcategories.map(sub => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level">Cấp độ *</Label>
                  <Select value={data.level} onValueChange={(value) => setData({ ...data, level: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn cấp độ" />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Ngôn ngữ</Label>
                  <Select value={data.language} onValueChange={(value) => setData({ ...data, language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vietnamese">Tiếng Việt</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Japanese">日本語</SelectItem>
                      <SelectItem value="Chinese">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Target Audience */}
        <TabsContent value="target" className="space-y-6">
          {/* Learning Objectives */}
          <Card>
            <CardHeader>
              <CardTitle>Học viên sẽ học được gì?</CardTitle>
              <CardDescription>
                Liệt kê các kỹ năng hoặc kiến thức cụ thể mà học viên sẽ đạt được sau khi hoàn thành khóa học. Tối thiểu 4 mục tiêu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="VD: Xây dựng ứng dụng web thực tế với React"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLearningObjective()}
                />
                <Button onClick={addLearningObjective}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {data.learningObjectives.length > 0 && (
                <div className="space-y-2">
                  {data.learningObjectives.map((obj) => (
                    <div key={obj.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="flex-1 text-sm">{obj.text}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLearningObjective(obj.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {data.learningObjectives.length < 4 && (
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Cần thêm {4 - data.learningObjectives.length} mục tiêu nữa
                </p>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Yêu cầu đầu vào</CardTitle>
              <CardDescription>
                Liệt kê các kiến thức hoặc công cụ mà học viên cần có trước khi bắt đầu khóa học.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="VD: Kiến thức cơ bản về HTML và CSS"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                />
                <Button onClick={addRequirement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {data.requirements.length > 0 && (
                <div className="space-y-2">
                  {data.requirements.map((req) => (
                    <div key={req.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                      <span className="text-sm flex-1">{req.text}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRequirement(req.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardHeader>
              <CardTitle>Khóa học dành cho ai?</CardTitle>
              <CardDescription>
                Mô tả đối tượng học viên lý tưởng cho khóa học này.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="VD: Lập trình viên muốn chuyển sang React"
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTargetAudience()}
                />
                <Button onClick={addTargetAudience}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {data.targetAudience.length > 0 && (
                <div className="space-y-2">
                  {data.targetAudience.map((aud) => (
                    <div key={aud.id} className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                      <span className="text-sm flex-1">{aud.text}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTargetAudience(aud.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Media */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ảnh khóa học *</CardTitle>
              <CardDescription>
                Tải lên ảnh thumbnail cho khóa học. Kích thước đề xuất: 750x422px (tỷ lệ 16:9). Tối đa 5MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.courseImagePreview ? (
                  <div className="relative">
                    <img
                      src={data.courseImagePreview}
                      alt="Course thumbnail"
                      className="w-full max-w-2xl rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setData({ ...data, courseImage: null, courseImagePreview: null })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa ảnh
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="mb-2">Kéo thả ảnh vào đây hoặc click để chọn</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG (tối đa 5MB)</p>
                  </div>
                )}
                
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                
                {isUploadingImage && (
                  <p className="text-sm text-muted-foreground text-center">
                    Uploading image...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video quảng cáo (Tùy chọn)</CardTitle>
              <CardDescription>
                Video giới thiệu ngắn về khóa học giúp tăng 5x tỷ lệ đăng ký. Tối đa 200MB, độ dài 1-2 phút.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.promotionalVideoPreview ? (
                  <div className="relative">
                    <video
                      src={data.promotionalVideoPreview}
                      controls
                      className="w-full max-w-2xl rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setData({ ...data, promotionalVideo: null, promotionalVideoPreview: null })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa video
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="mb-2">Kéo thả video vào đây hoặc click để chọn</p>
                    <p className="text-sm text-muted-foreground">MP4, MOV (tối đa 200MB)</p>
                  </div>
                )}
                
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
                {isUploadingVideo && (
                  <p className="text-sm text-muted-foreground text-center">
                    Uploading video...
                  </p>
                )}
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                <p className="text-sm">
                  <strong>💡 Mẹo:</strong> Video quảng cáo nên giới thiệu ngắn gọn về bạn, nội dung khóa học, 
                  và lý do tại sao học viên nên chọn khóa học này. Hãy nhiệt tình và chân thực!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Pricing & Tags */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Định giá khóa học</CardTitle>
              <CardDescription>
                Chọn mức giá phù hợp với giá trị và thời lượng khóa học của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="price">Giá khóa học</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="499000"
                    value={data.price}
                    onChange={(e) => setData({ ...data, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Đơn vị tiền tệ</Label>
                  <Select value={data.currency} onValueChange={(value) => setData({ ...data, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VND">VND (₫)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                <p className="text-sm mb-2"><strong>Gợi ý định giá:</strong></p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Khóa học ngắn (1-3 giờ): 199,000 - 399,000 VND</li>
                  <li>Khóa học trung bình (4-10 giờ): 399,000 - 799,000 VND</li>
                  <li>Khóa học dài (10+ giờ): 799,000 - 1,999,000 VND</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags & Từ khóa</CardTitle>
              <CardDescription>
                Thêm tags để giúp học viên dễ dàng tìm thấy khóa học của bạn. Tối đa 10 tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="VD: javascript, react, frontend"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} disabled={data.tags.length >= 10}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {data.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-2">
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {data.tags.length}/10 tags
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
          {isSaving ? 'Đang lưu...' : 'Lưu bản nháp'}
        </Button>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Xem trước
          </Button>
          <Button onClick={() => handleSave('submit_review')} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Đang lưu...' : 'Lưu & Xuất bản'}
          </Button>
        </div>
      </div>
    </div>
  )
}
