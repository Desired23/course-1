import React from 'react'
import { MessageSquare, Eye, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'
import { type Question, formatQADate } from '../../services/qa.api'
import { useRouter } from '../Router'

interface QuestionCardProps {
  question: Question
  className?: string
}

export function QuestionCard({ question, className }: QuestionCardProps) {
  const { navigate } = useRouter()

  return (
    <div
      className={cn(
        'flex gap-4 p-4 border-b hover:bg-gray-50/50 transition-colors cursor-pointer',
        className
      )}
      onClick={() => navigate(`/qa/${question.id}`)}
    >
      {/* Stats column */}
      <div className="flex flex-col items-end gap-1 min-w-[80px] text-sm text-gray-500 shrink-0">
        <div className={cn('flex flex-col items-center', question.score > 0 && 'text-green-600 font-semibold')}>
          <span className="font-medium">{question.score}</span>
          <span className="text-xs">vote</span>
        </div>
        <div
          className={cn(
            'flex flex-col items-center rounded px-1',
            question.answer_count > 0
              ? question.has_accepted_answer
                ? 'text-white bg-green-500 rounded px-2'
                : 'text-green-700 border border-green-500 rounded px-2'
              : ''
          )}
        >
          <span className="font-medium">{question.answer_count}</span>
          <span className="text-xs">trả lời</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-medium">{question.views}</span>
          <span className="text-xs">lượt xem</span>
        </div>
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="text-base font-medium text-blue-700 hover:text-blue-900 line-clamp-2 leading-snug">
            {question.title}
          </h3>
          {question.has_accepted_answer && (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          )}
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{question.content}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {question.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-2 py-0 h-5 cursor-pointer hover:bg-blue-100"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/qa?tag=${tag}`)
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="font-medium text-gray-600">{question.author_name ?? 'Ẩn danh'}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatQADate(question.created_at)}
          </span>
          {question.status !== 'open' && (
            <Badge variant="outline" className="text-xs px-1.5 h-4">
              {question.status === 'closed' ? 'Đã đóng' : 'Trùng lặp'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
