import { motion } from 'motion/react'
import { Avatar, AvatarFallback } from '../ui/avatar'

export function ChatTypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
      <Avatar className="mt-1 h-8 w-8">
        <AvatarFallback>...</AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-sm border bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
        </div>
      </div>
    </motion.div>
  )
}
