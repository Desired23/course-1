import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import {
  getSystemSettingByKey,
  createSystemSetting,
  updateSystemSetting,
  type SystemSetting,
} from '../../services/admin.api'

interface Props {
  settingKey: string
  label: string
  description?: string
}

const parseBool = (v: string) => ['1', 'true', 'yes', 'on'].includes((v ?? '').toLowerCase())

export default function AutoApproveToggle({ settingKey, label, description }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [setting, setSetting] = useState<SystemSetting | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSystemSettingByKey(settingKey).then(s => {
      setSetting(s)
      if (s) setEnabled(parseBool(s.value))
    })
  }, [settingKey])

  const handleChange = async (checked: boolean) => {
    setSaving(true)
    const value = checked ? 'true' : 'false'
    try {
      if (setting) {
        const updated = await updateSystemSetting(setting.id, { value })
        setSetting(updated)
      } else {
        const created = await createSystemSetting({ key: settingKey, value })
        setSetting(created)
      }
      setEnabled(checked)
      toast.success(checked ? 'Đã bật tự động duyệt' : 'Đã tắt tự động duyệt')
    } catch {
      toast.error('Không thể lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
      <Switch
        id={settingKey}
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={saving}
      />
      <div>
        <Label htmlFor={settingKey} className="cursor-pointer font-medium text-sm">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}
