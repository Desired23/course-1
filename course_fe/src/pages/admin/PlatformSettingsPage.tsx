import { useState } from 'react'
import { motion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../contexts/AuthContext'
import { HARDCODED_BACKUP_HOME_SCHEMA } from '../../features/home/hardcodedBackupSchema'
import { saveHomeSchemaV2 } from '../../features/home/service'
import { normalizeHomeSchemaV2 } from '../../features/home/schema'
import { confirmDialog } from '../../utils/confirmDialog'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function PlatformSettingsPage() {
  const { canAccess } = useAuth()
  const { t } = useTranslation()
  const [isRestoring, setIsRestoring] = useState(false)

  if (!canAccess(['admin'], ['admin.platform.settings'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('platform_settings.permission_denied')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const restoreOriginalUi = async () => {
    const confirmed = await confirmDialog(t('admin_home_layout.confirm.load_fake_data_description'))
    if (!confirmed) return

    try {
      setIsRestoring(true)
      const normalized = normalizeHomeSchemaV2(HARDCODED_BACKUP_HOME_SCHEMA)
      await saveHomeSchemaV2(normalized, null, 0)

      try {
        window.localStorage.removeItem('homepage_schema_v2_cached')
      } catch {

      }

      toast.success(t('admin_home_layout.toasts.save_schema_success'))
    } catch {
      toast.error(t('admin_home_layout.toasts.save_schema_failed'))
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <motion.div
      className="p-6 space-y-6 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="flex flex-wrap items-center justify-between gap-3" variants={fadeInUp}>
          <div>
            <h1 className="text-3xl font-bold">{t('platform_settings.title')}</h1>
            <p className="text-muted-foreground">{t('admin_home_layout.confirm.load_fake_data_description')}</p>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_home_layout.confirm.load_fake_data_title')}</CardTitle>
              <CardDescription>{t('admin_home_layout.confirm.load_fake_data_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={restoreOriginalUi} disabled={isRestoring}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {isRestoring ? t('common.loading') : t('admin_home_layout.confirm.load_fake_data_confirm')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
