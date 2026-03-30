import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Eye, ExternalLink, User, Calendar, MessageSquare, TrendingUp, Shield } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useRouter } from "./Router"

interface TopicPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic: {
    id: string
    title: string
    category: string
    author: string
    replies: number
    views: number
    lastActivity: string
    status: "active" | "locked" | "pinned" | "reported"
    createdAt: string
    content?: string
    excerpt?: string
  } | null
  onModerate?: () => void
}

export function QuickTopicPreview({ open, onOpenChange, topic, onModerate }: TopicPreviewProps) {
  const { navigate } = useRouter()
  const { t } = useTranslation()

  if (!topic) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "locked":
        return "secondary"
      case "pinned":
        return "default"
      case "reported":
        return "destructive"
      default:
        return "default"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("quick_topic_preview.status.active")
      case "locked":
        return t("quick_topic_preview.status.locked")
      case "pinned":
        return t("quick_topic_preview.status.pinned")
      case "reported":
        return t("quick_topic_preview.status.reported")
      default:
        return status
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{topic.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {topic.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {topic.createdAt}
                </span>
                <Badge variant={getStatusColor(topic.status)}>
                  {getStatusText(topic.status)}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{topic.views}</p>
                  <p className="text-xs text-muted-foreground">{t("quick_topic_preview.views")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{topic.replies}</p>
                  <p className="text-xs text-muted-foreground">{t("quick_topic_preview.replies")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("quick_topic_preview.activity")}</p>
                <p className="text-sm font-medium">{topic.lastActivity}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">{t("quick_topic_preview.category")}</h3>
          <Badge variant="outline">{topic.category}</Badge>
        </div>

        {topic.content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("quick_topic_preview.content")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary/30 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{topic.content}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="default"
            className="gap-2 flex-1"
            onClick={() => {
              onOpenChange(false)
              navigate(`/forum/topic/${topic.id}`)
            }}
          >
            <Eye className="h-4 w-4" />
            {t("quick_topic_preview.view_full")}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(`/forum/topic/${topic.id}`, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            {t("quick_topic_preview.open_new_tab")}
          </Button>
          {onModerate && (
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                onOpenChange(false)
                onModerate()
              }}
            >
              <Shield className="h-4 w-4" />
              {t("quick_topic_preview.moderate")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
