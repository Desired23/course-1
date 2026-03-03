import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card } from './ui/card'
import { Separator } from './ui/separator'
import {
  Settings as SettingsIcon,
  Lock,
  Clock,
  Users,
  Bell,
  Eye,
  Download
} from 'lucide-react'

interface Lesson {
  id: number
  title: string
  status: string
  is_free?: boolean
  duration: string
  settings?: {
    allowDownload?: boolean
    allowComments?: boolean
    requirePrevious?: boolean
    scheduledPublish?: string
    notifyStudents?: boolean
    accessLevel?: 'all' | 'enrolled' | 'premium'
    autoplay?: boolean
    showTranscript?: boolean
  }
}

interface SettingsTabProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
}

export function SettingsTab({ lesson, onUpdate }: SettingsTabProps) {
  const settings = lesson.settings || {}

  const handleSettingUpdate = (key: string, value: any) => {
    onUpdate({
      settings: {
        ...settings,
        [key]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Access Control */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">Access Control</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="access-level">Access Level</Label>
              <Select
                value={settings.accessLevel || 'enrolled'}
                onValueChange={(value) => handleSettingUpdate('accessLevel', value)}
              >
                <SelectTrigger id="access-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users (Free Preview)</SelectItem>
                  <SelectItem value="enrolled">Enrolled Students Only</SelectItem>
                  <SelectItem value="premium">Premium Members Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Require Previous Lesson</Label>
                <p className="text-xs text-muted-foreground">
                  Students must complete previous lesson first
                </p>
              </div>
              <Switch
                checked={settings.requirePrevious || false}
                onCheckedChange={(checked) => handleSettingUpdate('requirePrevious', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Separator />

      {/* Publishing Options */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">Publishing</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="scheduled-publish">Scheduled Publish Date</Label>
              <Input
                id="scheduled-publish"
                type="datetime-local"
                value={settings.scheduledPublish || ''}
                onChange={(e) => handleSettingUpdate('scheduledPublish', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to publish immediately when status is changed
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5" />
                  Notify Students
                </Label>
                <p className="text-xs text-muted-foreground">
                  Send notification when lesson is published
                </p>
              </div>
              <Switch
                checked={settings.notifyStudents || false}
                onCheckedChange={(checked) => handleSettingUpdate('notifyStudents', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Separator />

      {/* Student Features */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">Student Features</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-2">
                  <Download className="h-3.5 w-3.5" />
                  Allow Downloads
                </Label>
                <p className="text-xs text-muted-foreground">
                  Let students download lesson resources
                </p>
              </div>
              <Switch
                checked={settings.allowDownload !== false}
                onCheckedChange={(checked) => handleSettingUpdate('allowDownload', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Allow Comments</Label>
                <p className="text-xs text-muted-foreground">
                  Enable Q&A and discussion for this lesson
                </p>
              </div>
              <Switch
                checked={settings.allowComments !== false}
                onCheckedChange={(checked) => handleSettingUpdate('allowComments', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Show Transcript</Label>
                <p className="text-xs text-muted-foreground">
                  Display video transcript/captions
                </p>
              </div>
              <Switch
                checked={settings.showTranscript || false}
                onCheckedChange={(checked) => handleSettingUpdate('showTranscript', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Auto-play Next</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically play next lesson when complete
                </p>
              </div>
              <Switch
                checked={settings.autoplay || false}
                onCheckedChange={(checked) => handleSettingUpdate('autoplay', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Separator />

      {/* Additional Metadata */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">Additional Settings</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="seo-keywords">SEO Keywords</Label>
              <Input
                id="seo-keywords"
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated keywords for search optimization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor-notes">Instructor Notes (Private)</Label>
              <Textarea
                id="instructor-notes"
                placeholder="Private notes for instructors only..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes are only visible to course instructors
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
