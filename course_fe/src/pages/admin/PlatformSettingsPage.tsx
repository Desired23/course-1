import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Separator } from '../../components/ui/separator'
import { Badge } from '../../components/ui/badge'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Settings, DollarSign, Shield, Mail, Bell, Database, Users, CreditCard, FileText, Globe, Save, Plus, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'
import { useTranslation } from 'react-i18next'


interface PlatformSettings {
  general: {
    siteName: string
    siteDescription: string
    siteUrl: string
    supportEmail: string
    logoUrl: string
    faviconUrl: string
    defaultLanguage: string
    timezone: string
  }
  financial: {
    commissionPercentage: number
    payoutMinimum: number
    refundPeriod: number
    taxRate: number
    currency: string
    paymentMethods: {
      stripe: boolean
      paypal: boolean
      bankTransfer: boolean
    }
  }
  policies: {
    termsOfService: string
    privacyPolicy: string
    refundPolicy: string
    communityGuidelines: string
    copyrightPolicy: string
  }
  features: {
    allowUserRegistration: boolean
    requireEmailVerification: boolean
    enableCourseReviews: boolean
    enableQA: boolean
    enableBlog: boolean
    enableCertificates: boolean
    enableDiscussions: boolean
    enableLiveStreaming: boolean
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
    marketingEmails: boolean
  }
  security: {
    passwordMinLength: number
    requireStrongPassword: boolean
    enableTwoFactor: boolean
    sessionTimeout: number
    maxLoginAttempts: number
    ipWhitelist: string[]
  }
}

interface PaymentMethod {
  id: string
  name: string
  type: 'card' | 'bank' | 'wallet'
  enabled: boolean
  fees: number
  processingTime: string
}

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
  const defaultPaymentMethods: PaymentMethod[] = [
    { id: '1', name: 'Stripe', type: 'card', enabled: true, fees: 2.9, processingTime: t('platform_settings.financial.processing_times.instant') },
    { id: '2', name: 'PayPal', type: 'wallet', enabled: true, fees: 3.5, processingTime: t('platform_settings.financial.processing_times.instant') },
    { id: '3', name: t('platform_settings.financial.method_names.bank_transfer'), type: 'bank', enabled: false, fees: 1.0, processingTime: t('platform_settings.financial.processing_times.three_to_five_days') },
    { id: '4', name: 'Apple Pay', type: 'wallet', enabled: true, fees: 2.9, processingTime: t('platform_settings.financial.processing_times.instant') },
    { id: '5', name: 'Google Pay', type: 'wallet', enabled: true, fees: 2.9, processingTime: t('platform_settings.financial.processing_times.instant') }
  ]
  const [platformSettingId, setPlatformSettingId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const defaultSettings: PlatformSettings = {
    general: { siteName: 'EduPlatform', siteDescription: 'Learn new skills with expert-led courses', siteUrl: 'https://eduplatform.com', supportEmail: 'support@eduplatform.com', logoUrl: '/logo.png', faviconUrl: '/favicon.ico', defaultLanguage: 'en', timezone: 'UTC' },
    financial: { commissionPercentage: 30, payoutMinimum: 50, refundPeriod: 30, taxRate: 10, currency: 'USD', paymentMethods: { stripe: true, paypal: true, bankTransfer: false } },
    policies: { termsOfService: '', privacyPolicy: '', refundPolicy: '', communityGuidelines: '', copyrightPolicy: '' },
    features: { allowUserRegistration: true, requireEmailVerification: true, enableCourseReviews: true, enableQA: true, enableBlog: true, enableCertificates: true, enableDiscussions: true, enableLiveStreaming: false },
    notifications: { emailNotifications: true, pushNotifications: true, smsNotifications: false, marketingEmails: true },
    security: { passwordMinLength: 8, requireStrongPassword: true, enableTwoFactor: false, sessionTimeout: 3600, maxLoginAttempts: 5, ipWhitelist: [] }
  }
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [activeTab, setActiveTab] = useState('general')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void> | void)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: '',
    destructive: false,
    loading: false,
    action: null,
  })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(defaultPaymentMethods)

  useEffect(() => {
    const load = async () => {
      try {
        const sSettings = await getSystemSettings()
        const ps = sSettings.find(s => s.key === 'platform_settings')
        if (ps) {
          setPlatformSettingId(ps.id)
          try { setSettings({ ...defaultSettings, ...JSON.parse(ps.value) }) } catch {}
        }
      } catch {}
    }
    load()
  }, [])

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

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      const value = JSON.stringify(settings)
      if (platformSettingId) {
        await updateSystemSetting(platformSettingId, { value })
      } else {
        const created = await createSystemSetting({ key: 'platform_settings', value })
        setPlatformSettingId(created.id)
      }
      toast.success(t('platform_settings.save_success'))
    } catch {
      toast.error(t('platform_settings.save_failed'))
    } finally {
      setIsSaving(false)
    }
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void> | void,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState((prev) => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: '',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  const resetPaymentMethodForm = () => {
    setSelectedPaymentMethod({
      id: '',
      name: '',
      type: 'card',
      enabled: true,
      fees: 0,
      processingTime: '',
    })
    setIsPaymentDialogOpen(true)
  }

  const handleSavePaymentMethod = () => {
    if (!selectedPaymentMethod) return
    if (!selectedPaymentMethod.name.trim()) {
      toast.error(t('platform_settings.financial.toasts.name_required'))
      return
    }

    if (selectedPaymentMethod.id) {
      setPaymentMethods((prev) => prev.map((method) => method.id === selectedPaymentMethod.id ? selectedPaymentMethod : method))
      toast.success(t('platform_settings.financial.toasts.update_method_success'))
    } else {
      setPaymentMethods((prev) => [...prev, { ...selectedPaymentMethod, id: Date.now().toString() }])
      toast.success(t('platform_settings.financial.toasts.add_method_success'))
    }

    setIsPaymentDialogOpen(false)
    setSelectedPaymentMethod(null)
  }

  const updateSettings = (section: keyof PlatformSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const updateNestedSettings = (section: keyof PlatformSettings, nestedField: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedField]: {
          ...(prev[section] as any)[nestedField],
          [field]: value
        }
      }
    }))
  }

  return (
    <motion.div
      className="p-6 space-y-6 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl font-bold">{t('platform_settings.title')}</h1>
          <p className="text-muted-foreground">{t('platform_settings.subtitle')}</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Dang luu...' : t('platform_settings.save_changes')}
        </Button>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="relative grid w-full grid-cols-6 p-1">
          <TabsTrigger value="general" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'general' && <motion.span layoutId="platform-settings-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('platform_settings.tabs.general')}</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'financial' && <motion.span layoutId="platform-settings-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('platform_settings.tabs.financial')}</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'policies' && <motion.span layoutId="platform-settings-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('platform_settings.tabs.policies')}</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'features' && <motion.span layoutId="platform-settings-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('platform_settings.tabs.features')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'notifications' && <motion.span layoutId="platform-settings-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('platform_settings.tabs.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'security' && <motion.span layoutId="platform-settings-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('platform_settings.tabs.security')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('platform_settings.general.title')}
              </CardTitle>
              <CardDescription>{t('platform_settings.general.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">{t('platform_settings.general.site_name')}</Label>
                  <Input
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) => updateSettings('general', 'siteName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">{t('platform_settings.general.site_url')}</Label>
                  <Input
                    id="siteUrl"
                    value={settings.general.siteUrl}
                    onChange={(e) => updateSettings('general', 'siteUrl', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="siteDescription">{t('platform_settings.general.site_description')}</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.general.siteDescription}
                  onChange={(e) => updateSettings('general', 'siteDescription', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supportEmail">{t('platform_settings.general.support_email')}</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => updateSettings('general', 'supportEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultLanguage">{t('platform_settings.general.default_language')}</Label>
                  <Select value={settings.general.defaultLanguage} onValueChange={(value) => updateSettings('general', 'defaultLanguage', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('language_switcher.english')}</SelectItem>
                      <SelectItem value="es">{t('platform_settings.languages.spanish')}</SelectItem>
                      <SelectItem value="fr">{t('platform_settings.languages.french')}</SelectItem>
                      <SelectItem value="de">{t('platform_settings.languages.german')}</SelectItem>
                      <SelectItem value="vi">{t('language_switcher.vietnamese')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logoUrl">{t('platform_settings.general.logo_url')}</Label>
                  <Input
                    id="logoUrl"
                    value={settings.general.logoUrl}
                    onChange={(e) => updateSettings('general', 'logoUrl', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">{t('platform_settings.general.timezone')}</Label>
                  <Select value={settings.general.timezone} onValueChange={(value) => updateSettings('general', 'timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">{t('platform_settings.timezones.eastern')}</SelectItem>
                      <SelectItem value="America/Los_Angeles">{t('platform_settings.timezones.pacific')}</SelectItem>
                      <SelectItem value="Europe/London">{t('platform_settings.timezones.london')}</SelectItem>
                      <SelectItem value="Asia/Ho_Chi_Minh">{t('platform_settings.timezones.ho_chi_minh')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('platform_settings.financial.title')}
              </CardTitle>
              <CardDescription>{t('platform_settings.financial.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commissionPercentage">{t('platform_settings.financial.commission_percentage')}</Label>
                  <Input
                    id="commissionPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.financial.commissionPercentage}
                    onChange={(e) => updateSettings('financial', 'commissionPercentage', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('platform_settings.financial.commission_hint')}</p>
                </div>
                <div>
                  <Label htmlFor="payoutMinimum">{t('platform_settings.financial.minimum_payout')}</Label>
                  <Input
                    id="payoutMinimum"
                    type="number"
                    min="0"
                    value={settings.financial.payoutMinimum}
                    onChange={(e) => updateSettings('financial', 'payoutMinimum', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('platform_settings.financial.minimum_payout_hint')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="refundPeriod">{t('platform_settings.financial.refund_period')}</Label>
                  <Input
                    id="refundPeriod"
                    type="number"
                    min="0"
                    value={settings.financial.refundPeriod}
                    onChange={(e) => updateSettings('financial', 'refundPeriod', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="taxRate">{t('platform_settings.financial.tax_rate')}</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.financial.taxRate}
                    onChange={(e) => updateSettings('financial', 'taxRate', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">{t('platform_settings.financial.currency')}</Label>
                  <Select value={settings.financial.currency} onValueChange={(value) => updateSettings('financial', 'currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="VND">VND</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{t('platform_settings.financial.payment_methods')}</h3>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.financial.payment_methods_description')}</p>
                  </div>
                  <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={resetPaymentMethodForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('platform_settings.financial.add_method')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('platform_settings.financial.add_method')}</DialogTitle>
                        <DialogDescription>{t('platform_settings.financial.add_method_description')}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t('platform_settings.financial.form.name')}</Label>
                          <Input
                            value={selectedPaymentMethod?.name || ''}
                            onChange={(e) => setSelectedPaymentMethod((prev) => ({ ...(prev || { id: '', type: 'card', enabled: true, fees: 0, processingTime: '' }), name: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>{t('platform_settings.financial.form.type')}</Label>
                            <Select
                              value={selectedPaymentMethod?.type || 'card'}
                              onValueChange={(value: 'card' | 'bank' | 'wallet') => setSelectedPaymentMethod((prev) => ({ ...(prev || { id: '', name: '', enabled: true, fees: 0, processingTime: '' }), type: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="card">{t('platform_settings.financial.method_types.card')}</SelectItem>
                                <SelectItem value="bank">{t('platform_settings.financial.method_types.bank')}</SelectItem>
                                <SelectItem value="wallet">{t('platform_settings.financial.method_types.wallet')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>{t('platform_settings.financial.form.fees')}</Label>
                            <Input
                              type="number"
                              value={selectedPaymentMethod?.fees ?? 0}
                              onChange={(e) => setSelectedPaymentMethod((prev) => ({ ...(prev || { id: '', name: '', type: 'card', enabled: true, processingTime: '' }), fees: Number(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>{t('platform_settings.financial.form.processing_time')}</Label>
                          <Input
                            value={selectedPaymentMethod?.processingTime || ''}
                            onChange={(e) => setSelectedPaymentMethod((prev) => ({ ...(prev || { id: '', name: '', type: 'card', enabled: true, fees: 0 }), processingTime: e.target.value }))}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded border p-3">
                          <Label>{t('platform_settings.common.enabled')}</Label>
                          <Switch
                            checked={selectedPaymentMethod?.enabled ?? true}
                            onCheckedChange={(checked) => setSelectedPaymentMethod((prev) => ({ ...(prev || { id: '', name: '', type: 'card', fees: 0, processingTime: '' }), enabled: checked }))}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>{t('common.cancel')}</Button>
                          <Button onClick={handleSavePaymentMethod}>{t('platform_settings.financial.form.save_method')}</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('platform_settings.financial.table.method')}</TableHead>
                      <TableHead>{t('platform_settings.financial.table.type')}</TableHead>
                      <TableHead>{t('platform_settings.financial.table.fees')}</TableHead>
                      <TableHead>{t('platform_settings.financial.table.processing_time')}</TableHead>
                      <TableHead>{t('platform_settings.financial.table.status')}</TableHead>
                      <TableHead>{t('platform_settings.financial.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {method.type === 'card' && <CreditCard className="h-3 w-3 mr-1" />}
                            {t(`platform_settings.financial.method_types.${method.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{method.fees}%</TableCell>
                        <TableCell>{method.processingTime}</TableCell>
                        <TableCell>
                          <Badge variant={method.enabled ? 'default' : 'secondary'}>
                            {method.enabled ? t('platform_settings.common.enabled') : t('platform_settings.common.disabled')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedPaymentMethod(method)
                              setIsPaymentDialogOpen(true)
                            }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openConfirm(
                                t('platform_settings.financial.delete_method_title'),
                                t('platform_settings.financial.delete_method_description', { name: method.name }),
                                t('common.delete'),
                                () => {
                                  setPaymentMethods((prev) => prev.filter((item) => item.id !== method.id))
                                  toast.success(t('platform_settings.financial.toasts.delete_method_success'))
                                },
                                true,
                              )}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('platform_settings.policies.title')}
              </CardTitle>
              <CardDescription>{t('platform_settings.policies.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="termsOfService">{t('platform_settings.policies.terms_of_service')}</Label>
                <Textarea
                  id="termsOfService"
                  value={settings.policies.termsOfService}
                  onChange={(e) => updateSettings('policies', 'termsOfService', e.target.value)}
                  rows={8}
                  placeholder={t('platform_settings.policies.terms_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="privacyPolicy">{t('platform_settings.policies.privacy_policy')}</Label>
                <Textarea
                  id="privacyPolicy"
                  value={settings.policies.privacyPolicy}
                  onChange={(e) => updateSettings('policies', 'privacyPolicy', e.target.value)}
                  rows={8}
                  placeholder={t('platform_settings.policies.privacy_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="refundPolicy">{t('platform_settings.policies.refund_policy')}</Label>
                <Textarea
                  id="refundPolicy"
                  value={settings.policies.refundPolicy}
                  onChange={(e) => updateSettings('policies', 'refundPolicy', e.target.value)}
                  rows={6}
                  placeholder={t('platform_settings.policies.refund_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="communityGuidelines">{t('platform_settings.policies.community_guidelines')}</Label>
                <Textarea
                  id="communityGuidelines"
                  value={settings.policies.communityGuidelines}
                  onChange={(e) => updateSettings('policies', 'communityGuidelines', e.target.value)}
                  rows={6}
                  placeholder={t('platform_settings.policies.community_placeholder')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('platform_settings.features.title')}
              </CardTitle>
              <CardDescription>{t('platform_settings.features.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.user_registration')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.user_registration_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.allowUserRegistration}
                    onCheckedChange={(checked) => updateSettings('features', 'allowUserRegistration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.email_verification')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.email_verification_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.requireEmailVerification}
                    onCheckedChange={(checked) => updateSettings('features', 'requireEmailVerification', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.course_reviews')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.course_reviews_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.enableCourseReviews}
                    onCheckedChange={(checked) => updateSettings('features', 'enableCourseReviews', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.qa_section')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.qa_section_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.enableQA}
                    onCheckedChange={(checked) => updateSettings('features', 'enableQA', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.blog_posts')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.blog_posts_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.enableBlog}
                    onCheckedChange={(checked) => updateSettings('features', 'enableBlog', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.certificates')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.certificates_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.enableCertificates}
                    onCheckedChange={(checked) => updateSettings('features', 'enableCertificates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.discussions')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.discussions_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.enableDiscussions}
                    onCheckedChange={(checked) => updateSettings('features', 'enableDiscussions', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.features.live_streaming')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.features.live_streaming_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.features.enableLiveStreaming}
                    onCheckedChange={(checked) => updateSettings('features', 'enableLiveStreaming', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('platform_settings.notifications.title')}
              </CardTitle>
              <CardDescription>{t('platform_settings.notifications.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.notifications.email_notifications')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.notifications.email_notifications_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.notifications.push_notifications')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.notifications.push_notifications_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'pushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.notifications.sms_notifications')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.notifications.sms_notifications_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.notifications.smsNotifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'smsNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.notifications.marketing_emails')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.notifications.marketing_emails_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.notifications.marketingEmails}
                    onCheckedChange={(checked) => updateSettings('notifications', 'marketingEmails', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('platform_settings.security.title')}
              </CardTitle>
              <CardDescription>{t('platform_settings.security.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passwordMinLength">{t('platform_settings.security.minimum_password_length')}</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    min="6"
                    max="50"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => updateSettings('security', 'passwordMinLength', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout">{t('platform_settings.security.session_timeout')}</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="300"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="maxLoginAttempts">{t('platform_settings.security.max_login_attempts')}</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min="3"
                  max="10"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('platform_settings.security.max_login_attempts_hint')}</p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.security.strong_password')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.security.strong_password_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.security.requireStrongPassword}
                    onCheckedChange={(checked) => updateSettings('security', 'requireStrongPassword', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('platform_settings.security.two_factor')}</Label>
                    <p className="text-sm text-muted-foreground">{t('platform_settings.security.two_factor_hint')}</p>
                  </div>
                  <Switch
                    checked={settings.security.enableTwoFactor}
                    onCheckedChange={(checked) => updateSettings('security', 'enableTwoFactor', checked)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ipWhitelist">{t('platform_settings.security.ip_whitelist')}</Label>
                <Textarea
                  id="ipWhitelist"
                  placeholder={t('platform_settings.security.ip_whitelist_placeholder')}
                  value={settings.security.ipWhitelist.join('\n')}
                  onChange={(e) => updateSettings('security', 'ipWhitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('platform_settings.security.ip_whitelist_hint')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
      </motion.div>
      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </motion.div>
  )
}
