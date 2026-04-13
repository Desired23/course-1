import { MessageSquare, ThumbsUp, CheckCircle2 } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { cn } from './ui/utils'
import { useTranslation } from 'react-i18next'

interface AnswerCardProps {
  answer: {
    id: number
    content: string
    answeredBy: {
      name: string
      avatar?: string
      initials: string
      role?: string
    }
    answeredAt: string
    votes: number
    isInstructor: boolean
    isAccepted?: boolean
  }
  canMarkBestAnswer?: boolean
  onMarkBestAnswer?: (answerId: number) => void
  onVote?: (answerId: number) => void
  hasVoted?: boolean
}

export function AnswerCard({
  answer,
  canMarkBestAnswer = false,
  onMarkBestAnswer,
  onVote,
  hasVoted = false
}: AnswerCardProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "p-4 rounded-lg border space-y-3",
        answer.isAccepted && "border-green-500 bg-green-50 dark:bg-green-950/20"
      )}
    >

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={answer.answeredBy.avatar} />
            <AvatarFallback>{answer.answeredBy.initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{answer.answeredBy.name}</span>
              {answer.isInstructor && (
                <Badge variant="secondary" className="text-xs">
                  {t('answer_card.instructor')}
                </Badge>
              )}
              {answer.isAccepted && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t('answer_card.best_answer')}
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{answer.answeredAt}</span>
          </div>
        </div>
      </div>


      <p className="text-muted-foreground pl-13">{answer.content}</p>


      <div className="flex items-center gap-3 pl-13">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVote?.(answer.id)}
          className={cn(hasVoted && "text-primary")}
        >
          <ThumbsUp className={cn("w-4 h-4 mr-1", hasVoted && "fill-primary")} />
          {answer.votes}
        </Button>

        {canMarkBestAnswer && !answer.isAccepted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkBestAnswer?.(answer.id)}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {t('answer_card.mark_best_answer')}
          </Button>
        )}
      </div>
    </div>
  )
}
