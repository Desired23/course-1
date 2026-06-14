import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPublicPolicies, type PolicyKey } from '../../services/platform-config.api'

export function PolicyPage({ policyKey }: { policyKey: PolicyKey }) {
  const { t } = useTranslation()
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getPublicPolicies()
      .then((policies) => {
        if (!cancelled) setHtml(policies[policyKey] || '')
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [policyKey])

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">{t(`policy_pages.${policyKey}`)}</h1>
      {loading ? (
        <p className="text-muted-foreground">{t('policy_pages.loading')}</p>
      ) : html.trim() ? (
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-muted-foreground">{t('policy_pages.empty')}</p>
      )}
    </div>
  )
}
