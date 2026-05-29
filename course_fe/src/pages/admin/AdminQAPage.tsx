import React, { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Flag, CheckCircle2, XCircle, Lock, Eye, MessageSquare } from 'lucide-react'
import {
  type Question,
  type Answer,
  getQuestions,
  getAnswers,
  moderateQuestion,
  acceptAnswer,
  formatQADate,
  getStatusLabel,
} from '../../services/qa.api'

export function AdminQAPage() {
  const [reportedQuestions, setReportedQuestions] = useState<Question[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [reported, all] = await Promise.all([
        getQuestions({ status: undefined, sort: 'newest', page_size: 50 }),
        getQuestions({ sort: 'newest', page_size: 50 }),
      ])
      // Filter client-side for reported (report_count > 0)
      setReportedQuestions(all.results.filter(q => q.report_count > 0))
      setAllQuestions(all.results)
    } catch {
      setReportedQuestions([])
      setAllQuestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleModerate = async (questionId: number, action: 'approve' | 'dismiss' | 'close' | 'delete') => {
    setActionLoading(questionId)
    try {
      await moderateQuestion(questionId, action)
      await fetchData()
      if (selectedQuestion?.id === questionId) setSelectedQuestion(null)
    } catch {}
    setActionLoading(null)
  }

  const handleViewAnswers = async (question: Question) => {
    setSelectedQuestion(question)
    setLoadingAnswers(true)
    try {
      const res = await getAnswers(question.id)
      setAnswers(res.results)
    } catch {
      setAnswers([])
    } finally {
      setLoadingAnswers(false)
    }
  }

  const handleAcceptAnswer = async (questionId: number, answerId: number) => {
    setActionLoading(answerId)
    try {
      await acceptAnswer(questionId, answerId)
      const res = await getAnswers(questionId)
      setAnswers(res.results)
    } catch {}
    setActionLoading(null)
  }

  const QuestionRow = ({ question }: { question: Question }) => (
    <div className={`p-4 border-b last:border-0 hover:bg-gray-50/50 ${selectedQuestion?.id === question.id ? 'bg-blue-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 line-clamp-1">{question.title}</span>
            <Badge
              variant={question.status === 'open' ? 'outline' : 'secondary'}
              className="shrink-0 text-xs"
            >
              {getStatusLabel(question.status)}
            </Badge>
            {question.report_count > 0 && (
              <Badge variant="destructive" className="shrink-0 text-xs gap-1">
                <Flag className="w-3 h-3" /> {question.report_count}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 line-clamp-1 mb-1">{question.content}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{question.author_name}</span>
            <span>{formatQADate(question.created_at)}</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {question.answer_count}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {question.views}
            </span>
          </div>
          {question.last_report_reason && (
            <p className="text-xs text-red-500 mt-1">
              Lý do: {question.last_report_reason}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {question.report_count > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                disabled={actionLoading === question.id}
                onClick={() => handleModerate(question.id, 'dismiss')}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Bỏ qua
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                disabled={actionLoading === question.id}
                onClick={() => handleModerate(question.id, 'close')}
              >
                <Lock className="w-3 h-3 mr-1" /> Đóng
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                disabled={actionLoading === question.id}
                onClick={() => handleModerate(question.id, 'delete')}
              >
                <XCircle className="w-3 h-3 mr-1" /> Xóa
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => handleViewAnswers(question)}
          >
            <Eye className="w-3 h-3 mr-1" /> Câu TL
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Q&amp;A</h1>
        <p className="text-gray-500 text-sm">Kiểm duyệt câu hỏi và quản lý câu trả lời được chấp nhận</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Questions list */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="reported">
            <TabsList className="mb-4">
              <TabsTrigger value="reported">
                Bị báo cáo
                {reportedQuestions.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs px-1.5 h-4">
                    {reportedQuestions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
            </TabsList>

            <TabsContent value="reported">
              <div className="border rounded-lg bg-white overflow-hidden">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 border-b">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  ))
                ) : reportedQuestions.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <p className="font-medium text-sm">Không có câu hỏi nào bị báo cáo</p>
                  </div>
                ) : (
                  reportedQuestions.map(q => <QuestionRow key={q.id} question={q} />)
                )}
              </div>
            </TabsContent>

            <TabsContent value="all">
              <div className="border rounded-lg bg-white overflow-hidden">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 border-b">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))
                ) : (
                  allQuestions.map(q => <QuestionRow key={q.id} question={q} />)
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Answers panel */}
        <div>
          {selectedQuestion ? (
            <div className="border rounded-lg bg-white p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-800 leading-tight">
                  {selectedQuestion.title}
                </h3>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="text-gray-400 hover:text-gray-700 ml-2 shrink-0"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                {selectedQuestion.answer_count} câu trả lời
              </p>

              {loadingAnswers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="mb-3">
                    <Skeleton className="h-16 w-full rounded" />
                  </div>
                ))
              ) : answers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Chưa có câu trả lời</p>
              ) : (
                <div className="space-y-3">
                  {answers.map(answer => (
                    <div
                      key={answer.id}
                      className={`rounded-lg p-3 text-xs border ${answer.is_accepted ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                    >
                      {answer.is_accepted && (
                        <div className="flex items-center gap-1 text-green-600 font-medium mb-1">
                          <CheckCircle2 className="w-3 h-3" /> Được chấp nhận
                        </div>
                      )}
                      <p className="text-gray-700 line-clamp-3 mb-2">{answer.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">{answer.author_name} · score: {answer.score}</span>
                        {!answer.is_accepted && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs text-green-600 border-green-300"
                            disabled={actionLoading === answer.id}
                            onClick={() => handleAcceptAnswer(selectedQuestion.id, answer.id)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Chấp nhận
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg bg-white p-6 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Chọn một câu hỏi để xem câu trả lời</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
