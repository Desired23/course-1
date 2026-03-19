import { useState, useEffect } from 'react'
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
  title: '',
  subtitle: '',
  description: '',
  category: '',
  subcategory: '',
  level: '',
  language: 'Vietnamese',
  price: '',
  thumbnail: '',
  whatYouWillLearn: [''],
  requirements: [''],
  targetAudience: ['']
}

export function InstructorCreateCoursePage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<CourseData>(initialData)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [direction, setDirection] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  
  // API-fetched data
  const [apiCategories, setApiCategories] = useState<Category[]>([])
  const [apiSubcategories, setApiSubcategories] = useState<Category[]>([])
  const [instructorId, setInstructorId] = useState<number | null>(null)

  // Fetch categories
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
    if (!data.category) { setApiSubcategories([]); return }
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

  // Fetch instructor profile
  useEffect(() => {
    if (!user?.id) return
    getMyInstructorProfile(user.id).then(p => setInstructorId(p.id)).catch(console.error)
  }, [user?.id])

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const steps = [
    { id: 1, title: 'Thông tin cơ bản', icon: BookOpen },
    { id: 2, title: 'Cài đặt khóa học', icon: Settings },
    { id: 3, title: 'Nội dung học', icon: Users },
    { id: 4, title: 'Giá & Hình ảnh', icon: DollarSign }
  ]

  const handleNext = () => {
    if (!validateCurrentStep()) return

    if (currentStep < totalSteps) {
      setDirection(1)
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep(currentStep - 1)
    }
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!data.title.trim()) {
          toast.error('Vui lòng nhập tiêu đề khóa học')
          return false
        }
        if (!data.description.trim()) {
          toast.error('Vui lòng nhập mô tả khóa học')
          return false
        }
        break
      case 2:
        if (!data.category) {
          toast.error('Vui lòng chọn danh mục')
          return false
        }
        if (!data.level) {
          toast.error('Vui lòng chọn cấp độ')
          return false
        }
        break
      case 3:
        if (data.whatYouWillLearn.filter(x => x.trim()).length === 0) {
          toast.error('Vui lòng thêm ít nhất 1 mục học viên sẽ học được')
          return false
        }
        break
      case 4:
        if (!data.price) {
          toast.error('Vui lòng nhập giá khóa học')
          return false
        }
        break
    }
    return true
  }

  const handleSubmit = async (saveStatus: 'draft' | 'publish') => {
    if (saveStatus === 'publish' && !validateCurrentStep()) {
      return
    }

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
        learning_objectives: data.whatYouWillLearn.filter(x => x.trim()),
        requirements: data.requirements.filter(x => x.trim()).join('\n'),
        target_audience: data.targetAudience.filter(x => x.trim()),
        status: saveStatus === 'publish' ? 'pending' : 'draft',
      }
      if (instructorId) courseData.instructor = instructorId

      await createCourse(courseData)

      if (saveStatus === 'draft') {
        toast.success('Khóa học đã được lưu dưới dạng bản nháp!')
      } else {
        toast.success('Khóa học đã được tạo thành công!')
      }

      setTimeout(() => {
        navigate('/instructor/courses')
      }, 1000)
    } catch (err: any) {
      console.error('Create course failed:', err)
      toast.error(err?.message || 'Tạo khóa học thất bại')
    } finally {
      setIsSaving(false)
    }
  }

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose a valid image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be <= 5MB')
        return
      }

      try {
        setIsUploadingThumbnail(true)
        const uploaded = await uploadFiles([file])
        if (!uploaded?.length) throw new Error('Upload failed')
        const uploadedUrl = uploaded[0].url
        setThumbnailPreview(uploadedUrl)
        setData((prev) => ({ ...prev, thumbnail: uploadedUrl }))
        toast.success('Upload image successfully')
      } catch (err) {
        console.error('Thumbnail upload failed:', err)
        toast.error('Upload image failed')
      } finally {
        setIsUploadingThumbnail(false)
      }
    }
  }

  const addArrayItem = (field: 'whatYouWillLearn' | 'requirements' | 'targetAudience') => {
    setData({ ...data, [field]: [...data[field], ''] })
  }

  const removeArrayItem = (field: 'whatYouWillLearn' | 'requirements' | 'targetAudience', index: number) => {
    const newArray = data[field].filter((_, i) => i !== index)
    setData({ ...data, [field]: newArray.length > 0 ? newArray : [''] })
  }

  const updateArrayItem = (field: 'whatYouWillLearn' | 'requirements' | 'targetAudience', index: number, value: string) => {
    const newArray = [...data[field]]
    newArray[index] = value
    setData({ ...data, [field]: newArray })
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <Button variant="ghost" onClick={() => navigate('/instructor/courses')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại Khóa học của tôi
        </Button>
        <h1 className="mb-2">Tạo khóa học mới</h1>
        <p className="text-muted-foreground">Hoàn thành các bước để tạo khóa học của bạn</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2>Bước {currentStep} / {totalSteps}</h2>
          <Badge variant="outline">{Math.round(progress)}% hoàn thành</Badge>
        </div>
        <Progress value={progress} className="h-3 mb-6" />

        {/* Step indicators */}
        <div className="flex justify-between">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.id} className="flex flex-col items-center max-w-[100px]">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all mb-2 ${
                    currentStep >= step.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span className="text-xs text-center text-muted-foreground hidden md:block">{step.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
          >
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Thông tin cơ bản</CardTitle>
                  <CardDescription>Cung cấp thông tin thiết yếu về khóa học của bạn</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="title">Tiêu đề khóa học *</Label>
                    <Input
                      id="title"
                      value={data.title}
                      onChange={(e) => setData({ ...data, title: e.target.value })}
                      placeholder="VD: Khóa học Web Development toàn diện"
                      className="mt-2"
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.title.length}/100 ký tự
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="subtitle">Phụ đề</Label>
                    <Input
                      id="subtitle"
                      value={data.subtitle}
                      onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                      placeholder="VD: Học HTML, CSS, JavaScript, React và nhiều hơn nữa"
                      className="mt-2"
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.subtitle.length}/120 ký tự
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Mô tả khóa học *</Label>
                    <Textarea
                      id="description"
                      value={data.description}
                      onChange={(e) => setData({ ...data, description: e.target.value })}
                      placeholder="Mô tả chi tiết về nội dung khóa học, kết quả học tập và đối tượng mục tiêu..."
                      rows={8}
                      className="mt-2"
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.description.length}/1000 ký tự
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Course Settings */}
            {currentStep === 2 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Cài đặt khóa học</CardTitle>
                  <CardDescription>Cấu hình danh mục, cấp độ và ngôn ngữ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="category">Danh mục *</Label>
                      <Select value={data.category} onValueChange={(value) => setData({ ...data, category: value, subcategory: '' })}>
                        <SelectTrigger id="category" className="mt-2">
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
                      <Label htmlFor="subcategory">Danh mục phụ</Label>
                      <Select value={data.subcategory} onValueChange={(value) => setData({ ...data, subcategory: value })} disabled={!data.category}>
                        <SelectTrigger id="subcategory" className="mt-2">
                          <SelectValue placeholder="Chọn danh mục phụ" />
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
                        <SelectTrigger id="level" className="mt-2">
                          <SelectValue placeholder="Chọn cấp độ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner (Người mới)</SelectItem>
                          <SelectItem value="intermediate">Intermediate (Trung cấp)</SelectItem>
                          <SelectItem value="advanced">Advanced (Nâng cao)</SelectItem>
                          <SelectItem value="all_levels">All Levels (Mọi cấp độ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="language">Ngôn ngữ *</Label>
                      <Select value={data.language} onValueChange={(value) => setData({ ...data, language: value })}>
                        <SelectTrigger id="language" className="mt-2">
                          <SelectValue placeholder="Chọn ngôn ngữ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vietnamese">Tiếng Việt</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="Chinese">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Learning Content */}
            {currentStep === 3 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Nội dung học tập</CardTitle>
                  <CardDescription>Mô tả chi tiết những gì học viên sẽ đạt được</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Học viên sẽ học được gì? *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Thêm ít nhất 4 mục học tập chính
                    </p>
                    <div className="space-y-3">
                      {data.whatYouWillLearn.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateArrayItem('whatYouWillLearn', index, e.target.value)}
                            placeholder={`VD: Xây dựng ứng dụng web với React`}
                          />
                          {data.whatYouWillLearn.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeArrayItem('whatYouWillLearn', index)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem('whatYouWillLearn')}
                        className="w-full"
                      >
                        + Thêm mục
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Yêu cầu</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Kiến thức hoặc công cụ cần có trước khi học
                    </p>
                    <div className="space-y-3">
                      {data.requirements.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateArrayItem('requirements', index, e.target.value)}
                            placeholder="VD: Kiến thức cơ bản về HTML và CSS"
                          />
                          {data.requirements.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeArrayItem('requirements', index)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem('requirements')}
                        className="w-full"
                      >
                        + Thêm yêu cầu
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Khóa học này dành cho ai?</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Mô tả đối tượng học viên mục tiêu
                    </p>
                    <div className="space-y-3">
                      {data.targetAudience.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateArrayItem('targetAudience', index, e.target.value)}
                            placeholder="VD: Người mới bắt đầu muốn học lập trình web"
                          />
                          {data.targetAudience.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeArrayItem('targetAudience', index)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem('targetAudience')}
                        className="w-full"
                      >
                        + Thêm đối tượng
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Price & Thumbnail */}
            {currentStep === 4 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Giá & Hình ảnh</CardTitle>
                  <CardDescription>Thiết lập giá và tải lên hình ảnh cho khóa học</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="price">Giá khóa học (VNĐ) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="1000"
                      value={data.price}
                      onChange={(e) => setData({ ...data, price: e.target.value })}
                      placeholder="499000"
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Giá đề xuất: 299.000 - 2.999.000 VNĐ
                    </p>
                  </div>

                  <div>
                    <Label>Hình ảnh khóa học</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Kích thước đề xuất: 1200x675px (tỷ lệ 16:9)
                    </p>

                    {thumbnailPreview ? (
                      <div className="space-y-4">
                        <img 
                          src={thumbnailPreview} 
                          alt="Course thumbnail" 
                          className="w-full max-w-2xl rounded-lg shadow-md border"
                        />
                        <div className="flex gap-2">
                          <label htmlFor="thumbnailInput" className="cursor-pointer">
                            <div className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                              Thay đổi hình ảnh
                            </div>
                            <input
                              id="thumbnailInput"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleThumbnailChange}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center hover:border-purple-400 transition-colors">
                        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <label htmlFor="thumbnailInput" className="cursor-pointer">
                          <div className="inline-block px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl">
                            Chọn hình ảnh
                          </div>
                          <input
                            id="thumbnailInput"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleThumbnailChange}
                          />
                        </label>
                        <p className="text-sm text-muted-foreground mt-4">
                          Hoặc kéo thả hình ảnh vào đây
                        </p>
                      </div>
                    )}

                    {isUploadingThumbnail && (
                      <p className="mt-4 text-sm text-muted-foreground">Uploading image...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit('draft')}
              size="lg"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
            </Button>

            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                Tiếp theo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => handleSubmit('publish')}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
                disabled={isSaving}
              >
                <Check className="w-4 h-4 mr-2" />
                {isSaving ? 'Đang tạo...' : 'Tạo khóa học'}
              </Button>
            )}
          </div>
        </div>

        {/* Information */}
        <Card className="bg-muted/50 mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Bước tiếp theo sau khi tạo khóa học</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Thêm các phần và bài học vào chương trình giảng dạy</li>
              <li>• Tải lên video, tài liệu và tạo bài quiz</li>
              <li>• Thiết lập giá và các ưu đãi khuyến mãi</li>
              <li>• Gửi để xét duyệt trước khi xuất bản</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
