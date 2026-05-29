import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../ui/utils'

interface VoteButtonsProps {
  score: number
  userVote: 'up' | 'down' | null
  onVote: (voteType: 'up' | 'down') => void
  disabled?: boolean
  vertical?: boolean
}

export function VoteButtons({ score, userVote, onVote, disabled = false, vertical = true }: VoteButtonsProps) {
  return (
    <div className={cn('flex items-center gap-1', vertical ? 'flex-col' : 'flex-row')}>
      <button
        onClick={() => !disabled && onVote('up')}
        disabled={disabled}
        className={cn(
          'p-1 rounded transition-colors',
          userVote === 'up'
            ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
            : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        title="Upvote"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      <span
        className={cn(
          'font-semibold text-sm min-w-[1.5rem] text-center',
          score > 0 ? 'text-green-600' : score < 0 ? 'text-red-500' : 'text-gray-600'
        )}
      >
        {score}
      </span>

      <button
        onClick={() => !disabled && onVote('down')}
        disabled={disabled}
        className={cn(
          'p-1 rounded transition-colors',
          userVote === 'down'
            ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
            : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        title="Downvote"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  )
}
