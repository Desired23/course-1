import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Eye, FileText, Pencil, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { BlogRichEditor } from '../BlogRichEditor'
import {
  getPolicyDocuments,
  updatePolicyDocuments,
  type LegalPolicies,
  type PolicyKey,
} from '../../services/platform-config.api'

const POLICY_KEYS: PolicyKey[] = ['terms', 'privacy', 'refund', 'community']

const emptyPolicies: LegalPolicies = { terms: '', privacy: '', refund: '', community: '' }

export function PolicyDocumentsPanel() {
  const { t } = useTranslation()
  const [policies, setPolicies] = useState<LegalPolicies>(emptyPolicies)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingEditorImage, setUploadingEditorImage] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const data = await getPolicyDocuments()
      setPolicies({ ...emptyPolicies, ...data })
    } catch {
      toast.error(t('admin_policy.policies.toasts.load_failed'))
    } finally {
      setLoading(false)
    }
  }

  const setPolicy = (key: PolicyKey, html: string) => {
    setPolicies((prev) => ({ ...prev, [key]: html }))
  }

  const handleSave = async () => {
    if (uploadingEditorImage) return
    try {
      setSaving(true)
      const updated = await updatePolicyDocuments(policies)
      setPolicies({ ...emptyPolicies, ...updated })
      toast.success(t('admin_policy.policies.toasts.save_success'))
    } catch {
      toast.error(t('admin_policy.policies.toasts.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">{t('admin_policy.policies.loading')}</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('admin_policy.policies.title')}
            </CardTitle>
            <CardDescription>{t('admin_policy.policies.description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPreview((p) => !p)}>
              {preview ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {preview ? t('admin_policy.policies.edit_mode') : t('admin_policy.policies.preview_mode')}
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingEditorImage}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('admin_policy.saving') : t('admin_policy.policies.save')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="terms" className="space-y-4">
          <TabsList>
            {POLICY_KEYS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {t(`admin_policy.policies.items.${key}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {POLICY_KEYS.map((key) => (
            <TabsContent key={key} value={key}>
              {preview ? (
                policies[key]?.trim() ? (
                  <div
                    className="prose prose-slate min-h-[300px] max-w-none rounded-lg border p-6 dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: policies[key] }}
                  />
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center rounded-lg border text-muted-foreground">
                    {t('admin_policy.policies.empty_preview')}
                  </div>
                )
              ) : (
                <BlogRichEditor
                  content={policies[key]}
                  onChange={(html) => setPolicy(key, html)}
                  placeholder={t('admin_policy.policies.placeholder')}
                  minHeight="300px"
                  onUploadingChange={setUploadingEditorImage}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
