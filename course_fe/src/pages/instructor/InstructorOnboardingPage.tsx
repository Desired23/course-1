import { useState } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Progress } from "../../components/ui/progress"
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group"
import { Badge } from "../../components/ui/badge"
import { useRouter } from "../../components/Router"
import { motion, AnimatePresence } from 'motion/react'
import { submitApplication } from '../../services/application.api'
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  GraduationCap, 
  Video, 
  Users, 
  Target, 
  Upload,
  Linkedin,
  Globe,
  UserCheck,
  Award,
  Sparkles
} from 'lucide-react'
import { toast } from "sonner@2.0.3"

interface OnboardingData {
  teachingExperience: string
  videoExperience: string
  expertise: string
  teachingGoal: string
  existingAudience: string
  contentReady: string
  fullName: string
  headline: string
  bio: string
  linkedIn: string
  website: string
  profileImage: File | null
  idType: string
  idDocument: File | null
}

interface Question {
  id: string
  question: string
  description?: string
  type: 'radio' | 'text' | 'textarea' | 'file' | 'profile-image'
  field: keyof OnboardingData
  options?: { value: string; label: string; desc: string; icon?: any }[]
  required: boolean
  maxLength?: number
  accept?: string
  icon?: any
}

const questions: Question[] = [
  {
    id: 'q1',
    question: 'Bạn đã có kinh nghiệm giảng dạy trực tiếp chưa?',
    description: 'Hãy cho chúng tôi biết về kinh nghiệm giảng dạy của bạn',
    type: 'radio',
    field: 'teachingExperience',
    required: true,
    icon: GraduationCap,
    options: [
      { value: 'beginner', label: 'Chưa từng dạy', desc: 'Tôi hoàn toàn mới với việc giảng dạy' },
      { value: 'some', label: 'Có một chút', desc: 'Đã dạy vài buổi hoặc workshop nhỏ' },
      { value: 'experienced', label: 'Có kinh nghiệm', desc: 'Đã dạy nhiều khóa học hoặc lớp học' },
      { value: 'professional', label: 'Chuyên nghiệp', desc: 'Giảng dạy là nghề chính của tôi' },
    ]
  },
  {
    id: 'q2',
    question: 'Bạn đã có kinh nghiệm làm video bài giảng chưa?',
    description: 'Chúng tôi muốn hiểu kỹ năng sản xuất video của bạn',
    type: 'radio',
    field: 'videoExperience',
    required: true,
    icon: Video,
    options: [
      { value: 'no', label: 'Chưa từng', desc: 'Tôi chưa bao giờ quay video giảng dạy', icon: Video },
      { value: 'basic', label: 'Cơ bản', desc: 'Đã quay vài video đơn giản', icon: Video },
      { value: 'intermediate', label: 'Trung bình', desc: 'Có kỹ năng chỉnh sửa video cơ bản', icon: Video },
      { value: 'advanced', label: 'Nâng cao', desc: 'Thành thạo quay và edit video chuyên nghiệp', icon: Video },
    ]
  },
  {
    id: 'q3',
    question: 'Bạn là chuyên gia trong lĩnh vực nào?',
    description: 'Chọn lĩnh vực mà bạn có chuyên môn sâu nhất',
    type: 'radio',
    field: 'expertise',
    required: true,
    icon: Sparkles,
    options: [
      { value: 'development', label: 'Lập trình', desc: '💻' },
      { value: 'design', label: 'Thiết kế', desc: '🎨' },
      { value: 'business', label: 'Kinh doanh', desc: '💼' },
      { value: 'marketing', label: 'Marketing', desc: '📊' },
      { value: 'photography', label: 'Nhiếp ảnh', desc: '📷' },
      { value: 'other', label: 'Khác', desc: '🌟' },
    ]
  },
  {
    id: 'q4',
    question: 'Bạn muốn giảng dạy với mục đích gì?',
    description: 'Giúp chúng tôi hiểu rõ hơn về kế hoạch của bạn',
    type: 'radio',
    field: 'teachingGoal',
    required: true,
    icon: Target,
    options: [
      { value: 'hobby', label: 'Sở thích bán thời gian', desc: 'Kiếm thêm thu nhập phụ từ đam mê của tôi' },
      { value: 'side-business', label: 'Kinh doanh phụ', desc: 'Xây dựng nguồn thu nhập thụ động ổn định' },
      { value: 'full-time', label: 'Nghề chính', desc: 'Trở thành giảng viên chuyên nghiệp toàn thời gian' },
      { value: 'brand', label: 'Xây dựng thương hiệu', desc: 'Tăng uy tín và mở rộng tầm ảnh hưởng cá nhân' },
    ]
  },
  {
    id: 'q5',
    question: 'Bạn đã có sẵn cộng đồng học viên chưa?',
    description: 'Thông tin về lượng người theo dõi hiện tại của bạn',
    type: 'radio',
    field: 'existingAudience',
    required: true,
    icon: Users,
    options: [
      { value: 'no', label: 'Chưa có', desc: 'Tôi sẽ bắt đầu từ con số 0' },
      { value: 'small', label: 'Nhỏ (< 1,000)', desc: 'Có một số người theo dõi trên mạng xã hội' },
      { value: 'medium', label: 'Trung bình (1K - 10K)', desc: 'Đã có cộng đồng khá đông trên một số kênh' },
      { value: 'large', label: 'Lớn (> 10K)', desc: 'Có lượng fan đông đảo và tương tác tốt' },
    ]
  },
  {
    id: 'q6',
    question: 'Bạn đã chuẩn bị nội dung khóa học chưa?',
    description: 'Tình trạng chuẩn bị nội dung của bạn',
    type: 'radio',
    field: 'contentReady',
    required: true,
    icon: Award,
    options: [
      { value: 'none', label: 'Chưa có gì', desc: 'Tôi chỉ có ý tưởng, chưa làm gì cụ thể' },
      { value: 'outline', label: 'Có outline', desc: 'Đã lập dàn ý chi tiết cho khóa học' },
      { value: 'partial', label: 'Một phần', desc: 'Đã có sẵn một số bài giảng hoặc tài liệu' },
      { value: 'complete', label: 'Hoàn chỉnh', desc: 'Khóa học đã sẵn sàng, chỉ cần tải lên' },
    ]
  },
  {
    id: 'q7',
    question: 'Họ và tên của bạn là gì?',
    description: 'Tên đầy đủ sẽ hiển thị trên hồ sơ giảng viên',
    type: 'text',
    field: 'fullName',
    required: true,
    icon: Users
  },
  {
    id: 'q8',
    question: 'Tiêu đề chuyên môn của bạn?',
    description: 'VD: Senior Full-Stack Developer | 10+ years',
    type: 'text',
    field: 'headline',
    required: true,
    maxLength: 60,
    icon: Award
  },
  {
    id: 'q9',
    question: 'Giới thiệu về bản thân',
    description: 'Chia sẻ về kinh nghiệm, thành tựu và điều gì khiến bạn là một giảng viên tuyệt vời',
    type: 'textarea',
    field: 'bio',
    required: true,
    maxLength: 500,
    icon: Users
  },
  {
    id: 'q10',
    question: 'Tải lên ảnh hồ sơ',
    description: 'Ảnh chân dung chuyên nghiệp, tối thiểu 200x200px',
    type: 'profile-image',
    field: 'profileImage',
    required: true,
    icon: Upload,
    accept: 'image/*'
  },
  {
    id: 'q11',
    question: 'LinkedIn Profile (tùy chọn)',
    description: 'Thêm tín nhiệm cho hồ sơ của bạn',
    type: 'text',
    field: 'linkedIn',
    required: false,
    icon: Linkedin
  },
  {
    id: 'q12',
    question: 'Website cá nhân (tùy chọn)',
    description: 'Link đến portfolio hoặc blog cá nhân',
    type: 'text',
    field: 'website',
    required: false,
    icon: Globe
  },
  {
    id: 'q13',
    question: 'Loại giấy tờ tùy thân',
    description: 'Chọn loại giấy tờ bạn sẽ sử dụng để xác minh',
    type: 'radio',
    field: 'idType',
    required: true,
    icon: UserCheck,
    options: [
      { value: 'cccd', label: 'Căn cước công dân (CCCD)', desc: 'Thẻ CCCD gắn chip hoặc CMND' },
      { value: 'passport', label: 'Hộ chiếu (Passport)', desc: 'Hộ chiếu còn hiệu lực' },
      { value: 'driver', label: 'Giấy phép lái xe', desc: 'Bằng lái xe có ảnh' },
      { value: 'other', label: 'Giấy tờ khác', desc: 'Liên hệ support để được hỗ trợ' },
    ]
  },
  {
    id: 'q14',
    question: 'Tải lên ảnh giấy tờ',
    description: 'Ảnh rõ nét, đầy đủ 4 góc, thông tin dễ đọc, còn hiệu lực',
    type: 'file',
    field: 'idDocument',
    required: true,
    icon: Upload,
    accept: 'image/*,.pdf'
  }
]

const initialData: OnboardingData = {
  teachingExperience: '',
  videoExperience: '',
  expertise: '',
  teachingGoal: '',
  existingAudience: '',
  contentReady: '',
  fullName: '',
  headline: '',
  bio: '',
  linkedIn: '',
  website: '',
  profileImage: null,
  idType: '',
  idDocument: null,
}

export function InstructorOnboardingPage() {
  const { navigate } = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [data, setData] = useState<OnboardingData>(initialData)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [idPreview, setIdPreview] = useState<string | null>(null)
  const [direction, setDirection] = useState(0)

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  const handleNext = () => {
    const question = questions[currentQuestionIndex]
    const value = data[question.field]
    
    if (question.required && (!value || (typeof value === 'string' && !value.trim()))) {
      toast.error('Vui lòng trả lời câu hỏi này')
      return
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setDirection(1)
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setDirection(-1)
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    const question = questions[currentQuestionIndex]
    const value = data[question.field]
    
    if (question.required && (!value || (typeof value === 'string' && !value.trim()))) {
      toast.error('Vui lòng hoàn thành câu hỏi cuối cùng')
      return
    }
    
    try {
      // Map onboarding data to application responses
      const responses = questions.map((q, idx) => ({
        question: idx + 1, // question IDs map to form question IDs
        value: String(data[q.field] || ''),
      })).filter(r => r.value && r.value !== 'null')

      await submitApplication({
        form_id: 1, // Default instructor onboarding form
        responses,
      })

      toast.success('Đăng ký thành công! Chúng tôi sẽ xem xét và phê duyệt trong vòng 24-48 giờ.')
      
      setTimeout(() => {
        navigate('/instructor')
      }, 2000)
    } catch (err: any) {
      console.error(err)
      const msg = err?.response?.data?.error || err?.message || 'Submission failed'
      toast.error(msg)
    }
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setData({ ...data, profileImage: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleIdDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setData({ ...data, idDocument: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setIdPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const renderQuestion = (question: Question) => {
    const Icon = question.icon || GraduationCap
    
    switch (question.type) {
      case 'radio':
        return (
          <div className="space-y-4">
            <RadioGroup
              value={data[question.field] as string}
              onValueChange={(value) => setData({ ...data, [question.field]: value })}
            >
              <div className={`grid grid-cols-1 ${question.options && question.options.length > 4 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                {question.options?.map((option) => {
                  const OptionIcon = option.icon
                  return (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          data[question.field] === option.value 
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20 shadow-md' 
                            : 'hover:border-purple-300'
                        }`}
                        onClick={() => setData({ ...data, [question.field]: option.value })}
                      >
                        <CardContent className="p-4 flex items-start space-x-3">
                          <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {OptionIcon && <OptionIcon className="w-4 h-4 text-purple-600" />}
                              {!OptionIcon && option.desc.match(/[^\w\s]/) && (
                                <span className="text-2xl">{option.desc}</span>
                              )}
                              <Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer">
                                {option.label}
                              </Label>
                            </div>
                            {!option.desc.match(/[^\w\s]/) && (
                              <p className="text-sm text-muted-foreground mt-1">{option.desc}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </RadioGroup>
          </div>
        )
      
      case 'text':
        return (
          <div className="max-w-2xl mx-auto">
            <Input
              value={data[question.field] as string}
              onChange={(e) => setData({ ...data, [question.field]: e.target.value })}
              placeholder={question.description}
              maxLength={question.maxLength}
              className="text-lg p-6"
            />
            {question.maxLength && (
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {(data[question.field] as string).length}/{question.maxLength} ký tự
              </p>
            )}
          </div>
        )
      
      case 'textarea':
        return (
          <div className="max-w-2xl mx-auto">
            <Textarea
              value={data[question.field] as string}
              onChange={(e) => setData({ ...data, [question.field]: e.target.value })}
              placeholder={question.description}
              rows={8}
              maxLength={question.maxLength}
              className="text-base p-4"
            />
            {question.maxLength && (
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {(data[question.field] as string).length}/{question.maxLength} ký tự
              </p>
            )}
          </div>
        )
      
      case 'profile-image':
        return (
          <div className="max-w-md mx-auto">
            <div className="flex flex-col items-center gap-6">
              {profilePreview ? (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-40 h-40 rounded-full overflow-hidden border-4 border-purple-200 shadow-xl"
                >
                  <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                </motion.div>
              ) : (
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border-4 border-dashed border-purple-300">
                  <Upload className="w-12 h-12 text-purple-400" />
                </div>
              )}
              <label htmlFor="profileImageInput" className="cursor-pointer">
                <div className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl">
                  {profilePreview ? 'Thay đổi ảnh' : 'Tải ảnh lên'}
                </div>
                <input
                  id="profileImageInput"
                  type="file"
                  accept={question.accept}
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
              </label>
            </div>
          </div>
        )
      
      case 'file':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 hover:border-purple-400 transition-colors">
              {idPreview ? (
                <div className="space-y-4">
                  <motion.img 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={idPreview} 
                    alt="ID preview" 
                    className="max-h-64 mx-auto rounded-lg shadow-md" 
                  />
                  <div className="flex justify-center">
                    <label htmlFor="idDocumentInput" className="cursor-pointer">
                      <div className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                        Thay đổi ảnh
                      </div>
                      <input
                        id="idDocumentInput"
                        type="file"
                        accept={question.accept}
                        className="hidden"
                        onChange={handleIdDocumentChange}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <label htmlFor="idDocumentInput" className="cursor-pointer">
                    <div className="inline-block px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl">
                      Chọn file để tải lên
                    </div>
                    <input
                      id="idDocumentInput"
                      type="file"
                      accept={question.accept}
                      className="hidden"
                      onChange={handleIdDocumentChange}
                    />
                  </label>
                  <p className="text-sm text-muted-foreground mt-4">
                    Định dạng: JPG, PNG hoặc PDF. Tối đa 10MB
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>✓ Ảnh rõ nét, đầy đủ 4 góc của giấy tờ</p>
              <p>✓ Thông tin cá nhân phải rõ ràng, dễ đọc</p>
              <p>✓ Giấy tờ phải còn hiệu lực (chưa hết hạn)</p>
            </div>
          </div>
        )
      
      default:
        return null
    }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl"
            >
              Trở thành giảng viên
            </motion.h1>
            <Badge variant="outline" className="text-sm">
              {currentQuestionIndex + 1} / {totalQuestions}
            </Badge>
          </div>
          <Progress value={progress} className="h-3 mb-4" />
          <p className="text-sm text-muted-foreground">
            {Math.round(progress)}% hoàn thành
          </p>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQuestionIndex}
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
            <Card className="shadow-2xl border-2">
              <CardHeader className="text-center space-y-4 pb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  {currentQuestion.icon && <currentQuestion.icon className="w-8 h-8 text-white" />}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <CardTitle className="text-2xl md:text-3xl">
                    {currentQuestion.question}
                  </CardTitle>
                  {currentQuestion.description && (
                    <CardDescription className="text-base mt-2">
                      {currentQuestion.description}
                    </CardDescription>
                  )}
                </motion.div>
              </CardHeader>
              
              <CardContent className="pb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {renderQuestion(currentQuestion)}
                </motion.div>

                {currentQuestion.id === 'q10' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mt-6 max-w-2xl mx-auto"
                  >
                    <div className="flex gap-3">
                      <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">
                        <strong>Mẹo:</strong> Hồ sơ chuyên nghiệp giúp tăng 3x tỷ lệ học viên đăng ký khóa học của bạn.
                      </p>
                    </div>
                  </motion.div>
                )}

                {currentQuestion.id === 'q13' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mt-6"
                  >
                    <div className="flex gap-3">
                      <UserCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="mb-2">
                          <strong>Tại sao cần xác minh danh tính?</strong>
                        </p>
                        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                          <li>Bảo vệ học viên khỏi các tài khoản giả mạo</li>
                          <li>Đảm bảo bạn có thể nhận thanh toán hợp pháp</li>
                          <li>Tuân thủ quy định chống rửa tiền (AML/KYC)</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentQuestion.id === 'q14' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mt-6 max-w-2xl mx-auto"
                  >
                    <div className="flex gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">
                        <strong>Thông tin của bạn được bảo mật tuyệt đối.</strong> Dữ liệu được mã hóa và lưu trữ an toàn.
                      </p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between mt-8"
        >
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentQuestionIndex === 0}
            size="lg"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button 
              onClick={handleNext} 
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              Tiếp theo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Check className="w-4 h-4 mr-2" />
              Hoàn tất đăng ký
            </Button>
          )}
        </motion.div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Cần hỗ trợ?{' '}
            <a href="/support" className="text-purple-600 hover:underline">
              Liên hệ đội ngũ hỗ trợ
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
