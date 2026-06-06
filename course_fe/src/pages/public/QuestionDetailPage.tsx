import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Skeleton } from '../../components/ui/skeleton'
import { Separator } from '../../components/ui/separator'
import { CheckCircle2, ArrowLeft, Flag, Clock } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import {
  type Question,
  type Answer,
  getQuestion,
  getAnswers,
  createAnswer,
  voteQuestion,
  voteAnswer,
  reportQuestion,
  increaseQuestionViews,
  formatQADate,
} from '../../services/qa.api'
import { VoteButtons } from '../../components/qa/VoteButtons'
import { useWebSocket } from '../../hooks/useWebSocket'

interface QuestionDetailPageProps {
  questionId?: string
}

export function QuestionDetailPage({ questionId }: QuestionDetailPageProps) {
  const { navigate, params: routeParams } = useRouter()
  const { user } = useAuth()
  const id = Number(questionId ?? routeParams?.id)

  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [answerContent, setAnswerContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userQuestionVote, setUserQuestionVote] = useState<'up' | 'down' | null>(null)
  const [userAnswerVotes, setUserAnswerVotes] = useState<Record<number, 'up' | 'down' | null>>({})
  const [questionScore, setQuestionScore] = useState(0)
  const [answerScores, setAnswerScores] = useState<Record<number, number>>({})

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const [q, ans] = await Promise.all([
          getQuestion(id),
          getAnswers(id),
        ])
        setQuestion(q)
        setQuestionScore(q.score)
        setAnswers(ans.results)
        const scores: Record<number, number> = {}
        ans.results.forEach(a => { scores[a.id] = a.score })
        setAnswerScores(scores)
        increaseQuestionViews(id).catch(() => {})
      } catch {
        navigate('/qa')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useWebSocket({
    path: `/ws/questions/${id}/`,
    enabled: !!id,
    onMessage: useCallback((data: any) => {
      if (!data?.action) return
      if (data.action === 'answer_created') {
        setAnswers(prev => {
          if (prev.some(a => a.id === data.answer?.id)) return prev
          return [...prev, data.answer]
        })
        setAnswerScores(prev => ({ ...prev, [data.answer?.id]: data.answer?.score ?? 0 }))
        setQuestion(prev => prev ? { ...prev, answer_count: prev.answer_count + 1 } : prev)
      } else if (data.action === 'answer_updated') {
        setAnswers(prev => prev.map(a => a.id === data.answer?.id ? { ...a, ...data.answer } : a))
      } else if (data.action === 'answer_deleted') {
        setAnswers(prev => prev.filter(a => a.id !== data.answer_id))
        setQuestion(prev => prev ? { ...prev, answer_count: Math.max(0, prev.answer_count - 1) } : prev)
      } else if (data.action === 'question_voted') {
        setQuestionScore(data.score)
      } else if (data.action === 'answer_voted') {
        setAnswerScores(prev => ({ ...prev, [data.answer_id]: data.score }))
      }
    }, []),
  })

  const handleQuestionVote = async (voteType: 'up' | 'down') => {
    if (!user) { navigate('/login'); return }
    try {
      const res = await voteQuestion(id, voteType)
      setQuestionScore(res.score)
      setUserQuestionVote(res.user_vote)
    } catch {}
  }

  const handleAnswerVote = async (answerId: number, voteType: 'up' | 'down') => {
    if (!user) { navigate('/login'); return }
    try {
      const res = await voteAnswer(answerId, voteType)
      setAnswerScores(prev => ({ ...prev, [answerId]: res.score }))
      setUserAnswerVotes(prev => ({ ...prev, [answerId]: res.user_vote }))
    } catch {}
  }

  const handleSubmitAnswer = async () => {
    if (!answerContent.trim() || !user) return
    setSubmitting(true)
    try {
      const newAnswer = await createAnswer({ question: id, content: answerContent })
      setAnswers(prev => [...prev, newAnswer])
      setAnswerContent('')
      if (question) setQuestion({ ...question, answer_count: question.answer_count + 1 })
    } catch (e: any) {
      toast.error(e?.message || 'Không thể gửi câu trả lời. Vui lòng thử lại.')
    }
    setSubmitting(false)
  }

  const handleReport = async () => {
    if (!user) { navigate('/login'); return }
    const reason = window.prompt('Lý do báo cáo (tùy chọn):') ?? ''
    try {
      await reportQuestion(id, reason)
      toast.success('Đã báo cáo câu hỏi.')
    } catch (e: any) {
      toast.error(e?.message || 'Không thể báo cáo. Vui lòng thử lại.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <button
        onClick={() => navigate('/qa')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Question */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="flex gap-4">
          {/* Vote */}
          <VoteButtons
            score={questionScore}
            userVote={userQuestionVote}
            onVote={handleQuestionVote}
            disabled={!user}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{question.title}</h1>
            <p className="text-gray-700 whitespace-pre-wrap text-sm mb-4">{question.content}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {question.tags?.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-blue-100"
                  onClick={() => navigate(`/qa?tag=${tag}`)}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={question.author_avatar ?? ''} />
                  <AvatarFallback>{question.author_name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-gray-600">{question.author_name ?? 'Ẩn danh'}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatQADate(question.created_at)}
                </span>
              </div>
              <button
                onClick={handleReport}
                className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Flag className="w-3 h-3" /> Báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Answers */}
      {answers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {answers.length} câu trả lời
          </h2>
          <div className="space-y-4">
            {answers.map(answer => (
              <div
                key={answer.id}
                className={`border rounded-xl p-5 ${answer.is_accepted ? 'border-green-400 bg-green-50/30' : 'bg-white'}`}
              >
                <div className="flex gap-4">
                  <VoteButtons
                    score={answerScores[answer.id] ?? answer.score}
                    userVote={userAnswerVotes[answer.id] ?? null}
                    onVote={(v) => handleAnswerVote(answer.id, v)}
                    disabled={!user}
                  />
                  <div className="flex-1 min-w-0">
                    {answer.is_accepted && (
                      <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Câu trả lời được chấp nhận
                      </div>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap text-sm mb-3">{answer.content}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={answer.author_avatar ?? ''} />
                        <AvatarFallback>{answer.author_name?.[0] ?? '?'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-600">{answer.author_name ?? 'Ẩn danh'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatQADate(answer.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator className="my-6" />

      {/* Answer form */}
      {user ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Viết câu trả lời của bạn</h2>
          {question.status !== 'open' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 mb-3">
              Câu hỏi này đã bị {question.status === 'closed' ? 'đóng' : 'đánh dấu trùng lặp'}. Không thể thêm câu trả lời mới.
            </div>
          )}
          <Textarea
            placeholder="Chia sẻ kiến thức của bạn..."
            className="min-h-[150px] mb-3 text-sm"
            value={answerContent}
            onChange={e => setAnswerContent(e.target.value)}
            disabled={question.status !== 'open'}
          />
          <Button
            onClick={handleSubmitAnswer}
            disabled={!answerContent.trim() || submitting || question.status !== 'open'}
          >
            {submitting ? 'Đang gửi...' : 'Gửi câu trả lời'}
          </Button>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl border">
          <p className="text-gray-600 mb-3">Đăng nhập để viết câu trả lời</p>
          <Button onClick={() => navigate('/login')}>Đăng nhập</Button>
        </div>
      )}
    </div>
  )
}
