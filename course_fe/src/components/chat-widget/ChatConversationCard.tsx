import { motion } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

interface ChatConversationCardProps {
  id: string
  title: string
  preview: string
  updatedAt: Date
  unreadCount: number
  avatar?: string
  avatarFallback: string
  onClick: () => void
}

export function ChatConversationCard({
  id,
  title,
  preview,
  updatedAt,
  unreadCount,
  avatar,
  avatarFallback,
  onClick,
}: ChatConversationCardProps) {
  return (
    <motion.button
      layoutId={`conversation-${id}`}
      className="group w-full rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm dark:border-gray-800">
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-red-500 dark:border-gray-800" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100">
              {title}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="truncate text-xs font-medium text-muted-foreground">{preview}</p>
        </div>
      </div>
    </motion.button>
  )
}
