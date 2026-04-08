import { FormEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowRight,
  Bot,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  GraduationCap,
  ListChecks,
  Save,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'

type PlanVariant = 'default' | 'minimal' | 'skip-sql'
type Stage = 'goal' | 'skills' | 'ready'

interface CatalogCourse {
  course_id: string
  title: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  duration_hours: number
  estimated_weeks: number
  skills_taught: string[]
  prerequisites: string[]
  target_audience: string[]
}

interface LearningPathItem {
  course_id: string
  order: number
  reason: string
  is_skippable: boolean
  skippable_reason?: string
}

interface LearningPathResponse {
  path: LearningPathItem[]
  estimated_weeks: number
  summary: string
}

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const catalog: Record<string, CatalogCourse> = {
  'sql-basic': {
    course_id: 'sql-basic',
    title: 'SQL cơ bản cho người mới',
    level: 'Beginner',
    duration_hours: 20,
    estimated_weeks: 3,
    skills_taught: ['SELECT', 'JOIN', 'GROUP BY', 'data cleaning'],
    prerequisites: [],
    target_audience: ['Người mới chuyển sang Data', 'Kế toán muốn sang Data Analyst'],
  },
  'python-data': {
    course_id: 'python-data',
    title: 'Python cho Data (Pandas, NumPy)',
    level: 'Intermediate',
    duration_hours: 32,
    estimated_weeks: 5,
    skills_taught: ['Pandas', 'NumPy', 'EDA', 'automation'],
    prerequisites: ['Tư duy bảng dữ liệu', 'SQL căn bản'],
    target_audience: ['Người làm báo cáo', 'Junior analyst'],
  },
  'excel-power-query': {
    course_id: 'excel-power-query',
    title: 'Excel nâng cao & Power Query',
    level: 'Intermediate',
    duration_hours: 12,
    estimated_weeks: 2,
    skills_taught: ['Power Query', 'cleaning', 'report automation'],
    prerequisites: ['Excel căn bản'],
    target_audience: ['Kế toán', 'Back office analyst'],
  },
  'data-viz': {
    course_id: 'data-viz',
    title: 'Data Visualization & Storytelling',
    level: 'Intermediate',
    duration_hours: 24,
    estimated_weeks: 3,
    skills_taught: ['Dashboard thinking', 'chart selection', 'business storytelling'],
    prerequisites: ['Data wrangling', 'metrics thinking'],
    target_audience: ['Analyst', 'Reporting specialist'],
  },
}

const roadmapPresets: Record<PlanVariant, LearningPathResponse> = {
  default: {
    path: [
      {
        course_id: 'sql-basic',
        order: 1,
        reason: 'Bạn chưa biết SQL, đây là kỹ năng lõi để đọc và truy vấn dữ liệu cho vai trò Data Analyst.',
        is_skippable: false,
      },
      {
        course_id: 'python-data',
        order: 2,
        reason: 'Python giúp xử lý dữ liệu lớn, tự động hóa báo cáo và mở rộng beyond Excel.',
        is_skippable: false,
      },
      {
        course_id: 'excel-power-query',
        order: 3,
        reason: 'Bạn đã thành thạo Excel nên khóa này chỉ cần học phần Power Query để tăng tốc làm sạch dữ liệu.',
        is_skippable: true,
        skippable_reason: 'Có thể bỏ phần Excel nâng cao, chỉ học Power Query khoảng 4 giờ.',
      },
      {
        course_id: 'data-viz',
        order: 4,
        reason: 'Khóa này giúp trình bày insight rõ ràng với stakeholder, rất quan trọng khi chuyển từ kế toán sang analyst.',
        is_skippable: false,
      },
    ],
    estimated_weeks: 18,
    summary: 'Lộ trình ưu tiên nền tảng SQL, sau đó mở rộng sang Python và kỹ năng kể chuyện bằng dữ liệu.',
  },
  minimal: {
    path: [
      {
        course_id: 'sql-basic',
        order: 1,
        reason: 'Giữ lại phần SQL để bảo đảm bạn có nền tảng truy vấn dữ liệu trước khi học công cụ cao hơn.',
        is_skippable: false,
      },
      {
        course_id: 'python-data',
        order: 2,
        reason: 'Python là khóa có leverage lớn nhất nếu bạn muốn rút ngắn thời gian chuyển ngành.',
        is_skippable: false,
      },
      {
        course_id: 'data-viz',
        order: 3,
        reason: 'Chỉ giữ lại phần trực tiếp phục vụ portfolio và trình bày case study khi xin việc.',
        is_skippable: false,
      },
    ],
    estimated_weeks: 11,
    summary: 'Phiên bản tối thiểu chỉ giữ ba chặng tạo tác động lớn nhất cho mục tiêu chuyển sang Data Analyst.',
  },
  'skip-sql': {
    path: [
      {
        course_id: 'python-data',
        order: 1,
        reason: 'Bạn đã có SQL rồi nên Python trở thành bước mở rộng quan trọng nhất để tăng năng lực xử lý dữ liệu.',
        is_skippable: false,
      },
      {
        course_id: 'excel-power-query',
        order: 2,
        reason: 'Giữ phần Power Query để tận dụng kinh nghiệm Excel hiện có và kết nối tốt hơn với dữ liệu thực tế.',
        is_skippable: true,
        skippable_reason: 'Nếu bạn đã dùng Power Query trong công việc, có thể bỏ toàn bộ khóa này.',
      },
      {
        course_id: 'data-viz',
        order: 3,
        reason: 'Khóa này giúp bạn biến output kỹ thuật thành dashboard và câu chuyện có giá trị cho doanh nghiệp.',
        is_skippable: false,
      },
    ],
    estimated_weeks: 14,
    summary: 'SQL được loại khỏi lộ trình và thứ tự học được tính lại để ưu tiên công cụ tạo giá trị nhanh hơn.',
  },
}

const goalOptions = [
  'Chuyển ngành sang lĩnh vực mới',
  'Nâng cao kỹ năng trong nghề hiện tại',
  'Học để tự làm dự án cá nhân',
]

const skillOptions = [
  'Excel thành thạo, SQL chưa biết',
  'Đã biết SQL cơ bản rồi',
  'Tôi đang bắt đầu từ đầu',
]

const processSteps = [
  'User nhập mục tiêu',
  'AI hỏi làm rõ 1-2 câu',
  'Skill gap analysis',
  'Map sang catalog khóa học thật',
  'Sinh lộ trình có thứ tự + lý do',
  'User điều chỉnh và lưu lại',
]

const implementationRules = [
  'Catalog metadata phải đủ level, skills_taught, prerequisites, duration_hours, target_audience.',
  'AI chỉ được trả về course_id có thật trong catalog.',
  'Mỗi course cần reason rõ ràng, và phải đánh dấu is_skippable nếu user đã có skill.',
  'Learning path cần lưu lại để user quay lại vẫn thấy cùng context.',
]

function formatMonths(weeks: number) {
  return `~${(weeks / 4).toFixed(1)} tháng`
}

function createMessage(role: 'assistant' | 'user', content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  }
}

export function AiLearningPathPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const timerRef = useRef<number | null>(null)

  const [stage, setStage] = useState<Stage>('goal')
  const [draft, setDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activePlan, setActivePlan] = useState<PlanVariant | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', 'Xin chào! Tôi sẽ giúp bạn xây dựng lộ trình học phù hợp nhất.'),
    createMessage('assistant', 'Bạn đang hướng tới mục tiêu gì?'),
  ])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const currentPlan = activePlan ? roadmapPresets[activePlan] : null
  const roadmapItems = currentPlan?.path.map((item) => ({
    ...item,
    course: catalog[item.course_id],
  })) ?? []

  const startGeneration = (variant: PlanVariant, assistantContent: string) => {
    setIsGenerating(true)
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(() => {
      setActivePlan(variant)
      setStage('ready')
      setMessages((prev) => [...prev, createMessage('assistant', assistantContent)])
      setIsGenerating(false)
    }, 900)
  }

  const handleGoalSelection = (goal: string) => {
    setMessages((prev) => [
      ...prev,
      createMessage('user', goal),
      createMessage('assistant', 'Để gợi ý chính xác hơn, bạn đã từng làm việc với Excel nâng cao hoặc SQL chưa?'),
    ])
    setStage('skills')
  }

  const handleSkillSelection = (skillContext: string) => {
    setMessages((prev) => [...prev, createMessage('user', skillContext)])

    const normalized = skillContext.toLowerCase()
    const variant: PlanVariant = normalized.includes('sql cơ bản') ? 'skip-sql' : 'default'

    startGeneration(
      variant,
      variant === 'skip-sql'
        ? 'Mình đã loại khóa SQL, giữ lại Power Query ở trạng thái có thể bỏ qua và tính lại tổng thời gian học.'
        : 'Mình đã map mục tiêu của bạn sang catalog khóa học thật và tạo lộ trình có lý do cho từng chặng.'
    )
  }

  const handleAdjustment = (variant: PlanVariant, userText: string, assistantText: string) => {
    setMessages((prev) => [...prev, createMessage('user', userText)])
    startGeneration(variant, assistantText)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value || isGenerating) return

    setDraft('')

    if (stage === 'goal') {
      handleGoalSelection(value)
      return
    }

    if (stage === 'skills') {
      handleSkillSelection(value)
      return
    }

    const normalized = value.toLowerCase()
    if (normalized.includes('sql')) {
      handleAdjustment(
        'skip-sql',
        value,
        'Đã cập nhật context "tôi biết SQL rồi", bỏ khóa SQL và recalculate lại thứ tự học.'
      )
      return
    }

    if (normalized.includes('tối thiểu') || normalized.includes('rút gọn') || normalized.includes('nhanh')) {
      handleAdjustment(
        'minimal',
        value,
        'Mình đã rút gọn lộ trình xuống phiên bản tối thiểu, chỉ giữ các khóa tạo tác động nhanh nhất.'
      )
      return
    }

    handleAdjustment(
      'default',
      value,
      'Mình giữ mục tiêu chuyển ngành và tinh chỉnh lộ trình theo context vừa cập nhật.'
    )
  }

  const handleSavePath = () => {
    if (!currentPlan) {
      toast.error('Chưa có lộ trình để lưu.')
      return
    }
    toast.success('Mock save thành công. Bước tiếp theo là nối vào bảng learning_paths và learning_path_items.')
  }

  const handleCatalogAction = () => {
    if (user?.roles?.includes('instructor') || user?.roles?.includes('admin')) {
      navigate('/instructor/courses/create')
      return
    }

    toast('Phase 1 cần màn hình quản trị metadata catalog. Với tài khoản học viên, điểm này nên mở read-only catalog health view.')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_24%),#111315] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="border-white/10 bg-white/5 shadow-2xl shadow-black/20">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr] lg:p-8">
            <div className="space-y-4">
              <Badge className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/20">
                <Sparkles className="h-3.5 w-3.5" />
                AI tư vấn khóa học & lộ trình học tập
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Mockup chức năng tư vấn lộ trình học tập</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  Bản dựng này bám trực tiếp vào tài liệu triển khai của bạn: AI hỏi làm rõ ngắn gọn, map sang catalog khóa học thật,
                  trả về lộ trình có reason cho từng course, hỗ trợ skip những gì user đã biết và chuẩn bị sẵn điểm nối để lưu xuống DB.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100">Phase 1: Catalog metadata</Badge>
                <Badge variant="outline" className="border-blue-400/30 bg-blue-400/10 text-blue-100">Phase 2: AI response schema</Badge>
                <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">Phase 3: Recalculate & save</Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                <BrainCircuit className="h-4 w-4 text-blue-300" />
                Contract AI response
              </div>
              <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-xs leading-6 text-slate-300">
{`{
  "path": [
    {
      "course_id": "sql-basic",
      "order": 1,
      "reason": "...",
      "is_skippable": false
    }
  ],
  "estimated_weeks": 18,
  "summary": "..."
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.15fr]">
          <Card className="border-white/10 bg-white/5 shadow-2xl shadow-black/20">
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/20 text-blue-200">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Tư vấn lộ trình học tập</CardTitle>
                  <CardDescription className="text-slate-400">Dựa trên catalog khóa học thật và skill gap hiện tại</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-3 rounded-2xl bg-black/30 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === 'assistant' ? 'max-w-[85%]' : 'ml-auto max-w-[85%]'}
                  >
                    <div
                      className={
                        message.role === 'assistant'
                          ? 'rounded-2xl rounded-tl-md bg-white/6 px-4 py-3 text-sm leading-6 text-slate-100'
                          : 'rounded-2xl rounded-tr-md bg-blue-600/60 px-4 py-3 text-sm leading-6 text-white'
                      }
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {stage === 'goal' && !isGenerating && (
                  <div className="grid gap-2">
                    {goalOptions.map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant="outline"
                        className="justify-start border-white/15 bg-transparent text-left text-slate-100 hover:bg-white/10 hover:text-white"
                        onClick={() => handleGoalSelection(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}

                {stage === 'skills' && !isGenerating && (
                  <div className="grid gap-2">
                    {skillOptions.map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant="outline"
                        className="justify-start border-white/15 bg-transparent text-left text-slate-100 hover:bg-white/10 hover:text-white"
                        onClick={() => handleSkillSelection(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}

                {isGenerating && (
                  <div className="flex items-center gap-2 px-1 text-sm text-slate-400">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                    </span>
                    Đang phân tích skill gap và tạo lộ trình...
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Nhập câu hỏi hoặc mô tả mục tiêu của bạn..."
                  className="border-white/10 bg-black/20 text-slate-100 placeholder:text-slate-500"
                />
                <Button type="submit" disabled={isGenerating}>Gửi</Button>
              </form>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <Target className="h-4 w-4 text-emerald-300" />
                  Luồng triển khai theo thiết kế
                </div>
                <div className="grid gap-2 text-sm text-slate-300">
                  {processSteps.map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-slate-200">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-2xl shadow-black/20">
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-xl text-white">
                    {currentPlan ? 'Lộ trình: Kế toán -> Data Analyst' : 'Khu vực roadmap được đề xuất'}
                  </CardTitle>
                  <CardDescription className="mt-1 text-slate-400">
                    {currentPlan
                      ? currentPlan.summary
                      : 'Roadmap chỉ xuất hiện sau khi AI thu được mục tiêu, skill hiện có và map xong sang catalog.'}
                  </CardDescription>
                </div>

                {currentPlan && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-slate-400">Thời gian</div>
                      <div className="mt-1 font-medium text-white">{formatMonths(currentPlan.estimated_weeks)}</div>
                      <div className="text-xs text-slate-400">{currentPlan.estimated_weeks} tuần</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-slate-400">Khóa học</div>
                      <div className="mt-1 font-medium text-white">{currentPlan.path.length} khóa</div>
                      <div className="text-xs text-slate-400">Theo catalog thật</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-slate-400">Có thể bỏ</div>
                      <div className="mt-1 font-medium text-white">{currentPlan.path.filter((item) => item.is_skippable).length} khóa</div>
                      <div className="text-xs text-slate-400">Dựa trên skill hiện có</div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {!currentPlan ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                      <WandSparkles className="h-4 w-4 text-blue-300" />
                      Điều AI phải tuân thủ
                    </div>
                    <div className="space-y-3 text-sm text-slate-300">
                      {implementationRules.map((rule) => (
                        <div key={rule} className="flex gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                      <Database className="h-4 w-4 text-amber-300" />
                      Metadata catalog tối thiểu
                    </div>
                    <div className="grid gap-2 text-sm text-slate-300">
                      <Badge variant="outline" className="w-fit border-white/15 text-slate-200">level</Badge>
                      <Badge variant="outline" className="w-fit border-white/15 text-slate-200">skills_taught[]</Badge>
                      <Badge variant="outline" className="w-fit border-white/15 text-slate-200">prerequisites[]</Badge>
                      <Badge variant="outline" className="w-fit border-white/15 text-slate-200">duration_hours</Badge>
                      <Badge variant="outline" className="w-fit border-white/15 text-slate-200">target_audience</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {roadmapItems.map(({ course, ...item }) => (
                      <div
                        key={item.course_id}
                        className={
                          item.is_skippable
                            ? 'rounded-2xl border border-dashed border-amber-400/25 bg-amber-400/5 p-4 opacity-90'
                            : 'rounded-2xl border border-white/10 bg-black/20 p-4'
                        }
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/35 text-sm font-semibold text-white">
                            {item.order}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="text-lg font-medium text-white">{course.title}</div>
                                <div className="mt-1 text-sm leading-6 text-slate-300">{item.reason}</div>
                              </div>
                              {item.is_skippable && (
                                <Badge className="bg-amber-400/20 text-amber-100 hover:bg-amber-400/20">Có thể bỏ qua</Badge>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20">{course.level}</Badge>
                              <Badge variant="outline" className="border-white/10 bg-transparent text-slate-200">
                                <Clock3 className="h-3 w-3" />
                                {course.duration_hours}h · {course.estimated_weeks} tuần
                              </Badge>
                              <Badge variant="outline" className="border-white/10 bg-transparent text-slate-200">
                                <GraduationCap className="h-3 w-3" />
                                {course.skills_taught.slice(0, 2).join(' · ')}
                              </Badge>
                            </div>

                            {item.is_skippable && item.skippable_reason && (
                              <div className="mt-3 rounded-xl bg-black/25 px-3 py-2 text-sm text-amber-50">
                                {item.skippable_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
                      onClick={() =>
                        handleAdjustment(
                          'minimal',
                          'Cho tôi lộ trình tối thiểu.',
                          'Đã rút gọn xuống lộ trình tối thiểu nhưng vẫn giữ đúng prerequisite quan trọng nhất.'
                        )
                      }
                    >
                      <ListChecks className="h-4 w-4" />
                      Lộ trình tối thiểu
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
                      onClick={() =>
                        handleAdjustment(
                          'skip-sql',
                          'Tôi biết SQL rồi.',
                          'Đã loại SQL khỏi path, giữ nguyên logic prerequisite và giảm tổng thời gian học.'
                        )
                      }
                    >
                      <ArrowRight className="h-4 w-4" />
                      Tôi biết SQL rồi
                    </Button>
                    <Button type="button" onClick={handleSavePath}>
                      <Save className="h-4 w-4" />
                      Lưu lộ trình
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white"
                      onClick={handleCatalogAction}
                    >
                      <BookOpen className="h-4 w-4" />
                      Cập nhật catalog
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base text-white">1. Catalog metadata</CardTitle>
              <CardDescription className="text-slate-400">Ưu tiên tuyệt đối trước khi nối AI thật</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <div>Mỗi khóa phải đủ: level, skills_taught, prerequisites, duration_hours, target_audience.</div>
              <div>Thiếu metadata thì AI sẽ gợi ý sai prerequisite và lý do học.</div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base text-white">2. AI conversation flow</CardTitle>
              <CardDescription className="text-slate-400">Chỉ 1-2 câu hỏi làm rõ rồi sinh path</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <div>AI hỏi mục tiêu, kinh nghiệm hiện có, sau đó map thẳng sang catalog thật.</div>
              <div>Output luôn có `reason`, `estimated_weeks`, `is_skippable` và `skippable_reason`.</div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base text-white">3. Persist & iterate</CardTitle>
              <CardDescription className="text-slate-400">Chuẩn bị cho learning_paths / conversations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <div>Quick actions trong UI đã mô phỏng đúng hành vi recalculate khi user cập nhật context.</div>
              <div>Bước tiếp theo là thay state cục bộ bằng API lưu `learning_paths`, `learning_path_items`, `path_conversations`.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
