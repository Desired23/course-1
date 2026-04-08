import { MessageCircle } from 'lucide-react'

interface ChatEmptyStateProps {
  title: string
  description: string
}

export function ChatEmptyState({ title, description }: ChatEmptyStateProps) {
  return (
    <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <MessageCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
      <p className="mt-1 max-w-[220px] text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
