import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'

interface ChatWidgetHeaderProps {
  title: string
  subtitle: string
  isTyping: boolean
  hasActiveConversation: boolean
  children?: ReactNode
}

export function ChatWidgetHeader({
  title,
  subtitle,
  isTyping,
  hasActiveConversation,
  children,
}: ChatWidgetHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-4 text-white">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur-sm">
          <MessageCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="flex items-center gap-1 text-xs text-blue-100">
            {hasActiveConversation ? (
              <span className={`h-1.5 w-1.5 rounded-full ${isTyping ? 'animate-pulse bg-white' : 'bg-emerald-300'}`} />
            ) : null}
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  )
}
