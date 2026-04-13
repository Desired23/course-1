import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { FileText, Clock } from 'lucide-react'
import { cn } from './ui/utils'
import { useTranslation } from 'react-i18next'

interface ArticlePreviewProps {
  title: string
  content?: string
  duration?: string
  className?: string
}

export function ArticlePreview({
  title,
  content,
  duration,
  className
}: ArticlePreviewProps) {
  const { t } = useTranslation()
  const mockContent = content || t('article_preview.mock_content')

  return (
    <Card className={cn("overflow-hidden", className)}>

      <div className="border-b bg-muted/30 p-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            {duration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t('article_preview.reading_time', { duration })}</span>
              </div>
            )}
          </div>
          <Badge variant="secondary">{t('article_preview.badge')}</Badge>
        </div>
      </div>


      <div className="p-8">
        <div
          className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2
            prose-p:text-base prose-p:leading-relaxed prose-p:mb-4
            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
            prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
            prose-li:mb-2
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
            prose-strong:font-semibold prose-strong:text-foreground
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: mockContent }}
        />
      </div>
    </Card>
  )
}
