import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Palette, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { getPlatformConfig, updatePlatformConfig, type PlatformConfig } from '../../services/platform-config.api'

const SOCIAL_PLATFORMS = ['facebook', 'twitter', 'youtube', 'linkedin', 'instagram'] as const

export function SystemSettingsPanel() {
  const { t } = useTranslation()
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const data = await getPlatformConfig()
      setConfig({ ...data, social_links: data.social_links ?? {} })
    } catch {
      toast.error(t('admin_policy.system_settings.toasts.load_failed'))
    } finally {
      setLoading(false)
    }
  }

  const setField = <K extends keyof PlatformConfig>(field: K, value: PlatformConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const setSocial = (platform: string, url: string) => {
    setConfig((prev) => (prev ? { ...prev, social_links: { ...prev.social_links, [platform]: url } } : prev))
  }

  const handleSave = async () => {
    if (!config) return
    try {
      setSaving(true)
      const social_links = Object.fromEntries(
        Object.entries(config.social_links).filter(([, url]) => url && url.trim()),
      )
      const updated = await updatePlatformConfig({
        site_name: config.site_name,
        site_logo: config.site_logo,
        contact_email: config.contact_email,
        social_links,
        min_payout: config.min_payout,
        auto_approve_payout: config.auto_approve_payout,
        auto_approve_instructor_application: config.auto_approve_instructor_application,
      })
      setConfig({ ...updated, social_links: updated.social_links ?? {} })
      toast.success(t('admin_policy.system_settings.toasts.save_success'))
    } catch {
      toast.error(t('admin_policy.system_settings.toasts.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !config) {
    return <div className="py-12 text-center text-muted-foreground">{t('admin_policy.system_settings.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('admin_policy.system_settings.branding.title')}
          </CardTitle>
          <CardDescription>{t('admin_policy.system_settings.branding.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ss-site-name">{t('admin_policy.system_settings.branding.site_name')}</Label>
              <Input id="ss-site-name" value={config.site_name} onChange={(e) => setField('site_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ss-contact-email">{t('admin_policy.system_settings.branding.contact_email')}</Label>
              <Input id="ss-contact-email" type="email" value={config.contact_email} onChange={(e) => setField('contact_email', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ss-site-logo">{t('admin_policy.system_settings.branding.site_logo')}</Label>
            <Input id="ss-site-logo" value={config.site_logo} onChange={(e) => setField('site_logo', e.target.value)} placeholder="https://..." />
            {config.site_logo?.trim() && (
              <img
                src={config.site_logo}
                alt=""
                className="mt-2 h-10 w-auto rounded border object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
          <div className="space-y-3">
            <Label>{t('admin_policy.system_settings.branding.social_links')}</Label>
            {SOCIAL_PLATFORMS.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <span className="w-24 text-sm capitalize text-muted-foreground">{p}</span>
                <Input value={config.social_links[p] ?? ''} onChange={(e) => setSocial(p, e.target.value)} placeholder="https://..." />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('admin_policy.system_settings.operations.title')}
          </CardTitle>
          <CardDescription>{t('admin_policy.system_settings.operations.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-xs">
            <Label htmlFor="ss-min-payout">{t('admin_policy.system_settings.operations.min_payout')}</Label>
            <Input id="ss-min-payout" type="number" min="0" value={config.min_payout} onChange={(e) => setField('min_payout', e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">{t('admin_policy.system_settings.operations.min_payout_hint')}</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">{t('admin_policy.system_settings.operations.auto_approve_payout')}</p>
              <p className="text-sm text-muted-foreground">{t('admin_policy.system_settings.operations.auto_approve_payout_hint')}</p>
            </div>
            <Switch checked={config.auto_approve_payout} onCheckedChange={(v) => setField('auto_approve_payout', v)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">{t('admin_policy.system_settings.operations.auto_approve_application')}</p>
              <p className="text-sm text-muted-foreground">{t('admin_policy.system_settings.operations.auto_approve_application_hint')}</p>
            </div>
            <Switch
              checked={config.auto_approve_instructor_application}
              onCheckedChange={(v) => setField('auto_approve_instructor_application', v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? t('admin_policy.saving') : t('admin_policy.system_settings.save')}
        </Button>
      </div>
    </div>
  )
}
