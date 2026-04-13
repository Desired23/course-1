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
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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

      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">{t('settings_tab.access_control')}</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="access-level">{t('settings_tab.access_level')}</Label>
              <Select
                value={settings.accessLevel || 'enrolled'}
                onValueChange={(value) => handleSettingUpdate('accessLevel', value)}
              >
                <SelectTrigger id="access-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('settings_tab.access_all')}</SelectItem>
                  <SelectItem value="enrolled">{t('settings_tab.access_enrolled')}</SelectItem>
                  <SelectItem value="premium">{t('settings_tab.access_premium')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('settings_tab.require_previous')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings_tab.require_previous_hint')}
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


      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">{t('settings_tab.publishing')}</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="scheduled-publish">{t('settings_tab.scheduled_publish')}</Label>
              <Input
                id="scheduled-publish"
                type="datetime-local"
                value={settings.scheduledPublish || ''}
                onChange={(e) => handleSettingUpdate('scheduledPublish', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings_tab.scheduled_publish_hint')}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5" />
                  {t('settings_tab.notify_students')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings_tab.notify_students_hint')}
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


      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">{t('settings_tab.student_features')}</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-2">
                  <Download className="h-3.5 w-3.5" />
                  {t('settings_tab.allow_downloads')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings_tab.allow_downloads_hint')}
                </p>
              </div>
              <Switch
                checked={settings.allowDownload !== false}
                onCheckedChange={(checked) => handleSettingUpdate('allowDownload', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('settings_tab.allow_comments')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings_tab.allow_comments_hint')}
                </p>
              </div>
              <Switch
                checked={settings.allowComments !== false}
                onCheckedChange={(checked) => handleSettingUpdate('allowComments', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('settings_tab.show_transcript')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings_tab.show_transcript_hint')}
                </p>
              </div>
              <Switch
                checked={settings.showTranscript || false}
                onCheckedChange={(checked) => handleSettingUpdate('showTranscript', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('settings_tab.autoplay_next')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings_tab.autoplay_next_hint')}
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


      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">{t('settings_tab.additional_settings')}</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="seo-keywords">{t('settings_tab.seo_keywords')}</Label>
              <Input
                id="seo-keywords"
                placeholder={t('settings_tab.seo_keywords_placeholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings_tab.seo_keywords_hint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor-notes">{t('settings_tab.instructor_notes')}</Label>
              <Textarea
                id="instructor-notes"
                placeholder={t('settings_tab.instructor_notes_placeholder')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings_tab.instructor_notes_hint')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
