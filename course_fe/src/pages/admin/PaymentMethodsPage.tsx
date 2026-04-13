import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Switch } from '../../components/ui/switch'
import { Separator } from '../../components/ui/separator'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Building,
  Smartphone,
  Wallet,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Save
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'
import { useTranslation } from 'react-i18next'

interface PaymentMethod {
  id: string
  name: string
  type: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_transfer' | 'crypto'
  provider: string
  details: {
    last4?: string
    expiryMonth?: number
    expiryYear?: number
    brand?: string
    email?: string
    walletId?: string
    accountNumber?: string
    bankName?: string
  }
  isDefault: boolean
  isActive: boolean
  isVerified: boolean
  fees: {
    fixed: number
    percentage: number
  }
  limits: {
    min: number
    max: number
    daily: number
    monthly: number
  }
  countries: string[]
  currencies: string[]
  processingTime: string
  securityFeatures: string[]
  createdAt: Date
  lastUsed?: Date
}

interface PaymentSettings {
  autoRetry: boolean
  retryAttempts: number
  retryDelay: number
  sendReceipts: boolean
  requireCVV: boolean
  savePaymentMethods: boolean
  twoFactorAuth: boolean
  fraudDetection: boolean
  ipWhitelist: boolean
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



export function PaymentMethodsPage() {
  const { canAccess } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('methods')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [settings, setSettings] = useState<PaymentSettings>({
    autoRetry: true, retryAttempts: 3, retryDelay: 24, sendReceipts: true,
    requireCVV: true, savePaymentMethods: true, twoFactorAuth: false,
    fraudDetection: true, ipWhitelist: false
  })
  const [methodsSettingId, setMethodsSettingId] = useState<number | null>(null)
  const [settingsSettingId, setSettingsSettingId] = useState<number | null>(null)
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [isEditingMethod, setIsEditingMethod] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: t('common.confirm'),
    destructive: false,
    loading: false,
    action: null,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const allSettings = await getSystemSettings()
        const methodsSetting = allSettings.find(s => s.key === 'payment_methods_config')
        const settingsSetting = allSettings.find(s => s.key === 'payment_settings_config')
        if (methodsSetting) {
          setMethodsSettingId(methodsSetting.id)
          try {
            const parsed = JSON.parse(methodsSetting.value)
            setPaymentMethods(parsed.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt), lastUsed: m.lastUsed ? new Date(m.lastUsed) : undefined })))
          } catch {}
        }
        if (settingsSetting) {
          setSettingsSettingId(settingsSetting.id)
          try { setSettings(JSON.parse(settingsSetting.value)) } catch {}
        }
      } catch {}
    }
    load()
  }, [])

  const [newMethod, setNewMethod] = useState({
    name: '',
    type: 'credit_card' as PaymentMethod['type'],
    provider: '',
    apiKey: '',
    secretKey: '',
    webhookUrl: ''
  })

  if (!canAccess(['admin'], ['admin.platform.settings'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('payment_methods_admin.permission_denied')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleAddMethod = async () => {
    try {
      const method: PaymentMethod = {
        id: Date.now().toString(), name: newMethod.name, type: newMethod.type,
        provider: newMethod.provider, details: {}, isDefault: false, isActive: true,
        isVerified: false, fees: { fixed: 0, percentage: 0 },
        limits: { min: 0, max: 10000, daily: 50000, monthly: 200000 },
        countries: [], currencies: [], processingTime: 'Instant',
        securityFeatures: [], createdAt: new Date()
      }
      const updated = [...paymentMethods, method]
      const value = JSON.stringify(updated)
      if (methodsSettingId) { await updateSystemSetting(methodsSettingId, { value }) }
      else { const c = await createSystemSetting({ key: 'payment_methods_config', value }); setMethodsSettingId(c.id) }
      setPaymentMethods(updated)
      toast.success(t('payment_methods_admin.add_success'))
      setIsAddMethodOpen(false)
      setNewMethod({ name: '', type: 'credit_card', provider: '', apiKey: '', secretKey: '', webhookUrl: '' })
    } catch { toast.error(t('payment_methods_admin.action_failed')) }
  }

  const handleToggleMethod = async (methodId: string) => {
    const updated = paymentMethods.map(m => m.id === methodId ? { ...m, isActive: !m.isActive } : m)
    try {
      const value = JSON.stringify(updated)
      if (methodsSettingId) await updateSystemSetting(methodsSettingId, { value })
      setPaymentMethods(updated)
      toast.success(t('payment_methods_admin.update_success'))
    } catch { toast.error(t('payment_methods_admin.action_failed')) }
  }

  const handleDeleteMethod = async (methodId: string) => {
    const updated = paymentMethods.filter(m => m.id !== methodId)
    try {
      const value = JSON.stringify(updated)
      if (methodsSettingId) await updateSystemSetting(methodsSettingId, { value })
      setPaymentMethods(updated)
      toast.success(t('payment_methods_admin.delete_success'))
    } catch { toast.error(t('payment_methods_admin.action_failed')) }
  }

  const handleSaveSettings = async () => {
    try {
      const value = JSON.stringify(settings)
      if (settingsSettingId) { await updateSystemSetting(settingsSettingId, { value }) }
      else { const c = await createSystemSetting({ key: 'payment_settings_config', value }); setSettingsSettingId(c.id) }
      toast.success(t('payment_methods_admin.save_success'))
    } catch { toast.error(t('payment_methods_admin.save_failed')) }
  }

  const getMethodIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-5 w-5" />
      case 'paypal':
        return <Wallet className="h-5 w-5" />
      case 'apple_pay':
      case 'google_pay':
        return <Smartphone className="h-5 w-5" />
      case 'bank_transfer':
        return <Building className="h-5 w-5" />
      case 'crypto':
        return <Globe className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getStatusColor = (method: PaymentMethod) => {
    if (!method.isActive) return 'text-gray-500'
    if (!method.isVerified) return 'text-yellow-500'
    return 'text-green-500'
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
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
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: t('common.confirm'),
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <motion.div
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl font-bold">{t('payment_methods_admin.title')}</h1>
          <p className="text-muted-foreground">{t('payment_methods_admin.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveSettings}>
            <Save className="h-4 w-4 mr-2" />
            {t('payment_methods_admin.save_settings')}
          </Button>
          <Dialog open={isAddMethodOpen} onOpenChange={setIsAddMethodOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('payment_methods_admin.add_method')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('payment_methods_admin.add_method')}</DialogTitle>
                <DialogDescription>{t('payment_methods_admin.add_method_description')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('payment_methods_admin.method_name')}</Label>
                    <Input
                      value={newMethod.name}
                      onChange={(e) => setNewMethod({...newMethod, name: e.target.value})}
                      placeholder={t('payment_methods_admin.method_name_placeholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('payment_methods_admin.payment_type')}</Label>
                    <Select value={newMethod.type} onValueChange={(value) => setNewMethod({...newMethod, type: value as PaymentMethod['type']})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">{t('payment_methods_admin.types.credit_card')}</SelectItem>
                        <SelectItem value="debit_card">{t('payment_methods_admin.types.debit_card')}</SelectItem>
                        <SelectItem value="paypal">{t('payment_methods_admin.types.paypal')}</SelectItem>
                        <SelectItem value="apple_pay">{t('payment_methods_admin.types.apple_pay')}</SelectItem>
                        <SelectItem value="google_pay">{t('payment_methods_admin.types.google_pay')}</SelectItem>
                        <SelectItem value="bank_transfer">{t('payment_methods_admin.types.bank_transfer')}</SelectItem>
                        <SelectItem value="crypto">{t('payment_methods_admin.types.crypto')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{t('payment_methods_admin.provider')}</Label>
                  <Input
                    value={newMethod.provider}
                    onChange={(e) => setNewMethod({...newMethod, provider: e.target.value})}
                    placeholder={t('payment_methods_admin.provider_placeholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('payment_methods_admin.api_key')}</Label>
                    <div className="relative">
                      <Input
                        type={showApiKeys ? 'text' : 'password'}
                        value={newMethod.apiKey}
                        onChange={(e) => setNewMethod({...newMethod, apiKey: e.target.value})}
                        placeholder={t('payment_methods_admin.api_key_placeholder')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKeys(!showApiKeys)}
                      >
                        {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>{t('payment_methods_admin.secret_key')}</Label>
                    <Input
                      type="password"
                      value={newMethod.secretKey}
                      onChange={(e) => setNewMethod({...newMethod, secretKey: e.target.value})}
                      placeholder={t('payment_methods_admin.secret_key_placeholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('payment_methods_admin.webhook_url')}</Label>
                  <Input
                    value={newMethod.webhookUrl}
                    onChange={(e) => setNewMethod({...newMethod, webhookUrl: e.target.value})}
                    placeholder={t('payment_methods_admin.webhook_placeholder')}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddMethodOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleAddMethod}>
                    {t('payment_methods_admin.add_method')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="relative grid w-full grid-cols-4 p-1">
          <TabsTrigger value="methods" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'methods' && <motion.span layoutId="payment-methods-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_methods_admin.tabs.methods')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'settings' && <motion.span layoutId="payment-methods-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_methods_admin.tabs.settings')}</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'fees' && <motion.span layoutId="payment-methods-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_methods_admin.tabs.fees')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'security' && <motion.span layoutId="payment-methods-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_methods_admin.tabs.security')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('payment_methods_admin.active_methods_title')}</CardTitle>
              <CardDescription>{t('payment_methods_admin.active_methods_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full bg-blue-100 ${getStatusColor(method)}`}>
                        {getMethodIcon(method.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{method.name}</h3>
                          {method.isDefault && <Badge variant="default">{t('payment_methods_admin.default')}</Badge>}
                          {method.isVerified ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('payment_methods_admin.verified')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {t('payment_methods_admin.pending')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{t('payment_methods_admin.provider_label', { provider: method.provider })}</span>
                          <span>{t('payment_methods_admin.fee_label', { percentage: method.fees.percentage, fixed: method.fees.fixed })}</span>
                          <span>{t('payment_methods_admin.processing_label', { time: method.processingTime })}</span>
                          {method.lastUsed && (
                            <span>{t('payment_methods_admin.last_used', { date: method.lastUsed.toLocaleDateString() })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={method.isActive}
                        onCheckedChange={() => openConfirm(
                          method.isActive ? t('payment_methods_admin.confirm.disable_title') : t('payment_methods_admin.confirm.enable_title'),
                          method.isActive
                            ? t('payment_methods_admin.confirm.disable_description', { name: method.name })
                            : t('payment_methods_admin.confirm.enable_description', { name: method.name }),
                          method.isActive ? t('payment_methods_admin.confirm.disable_label') : t('payment_methods_admin.confirm.enable_label'),
                          () => handleToggleMethod(method.id),
                        )}
                      />
                      <Button size="sm" variant="outline" onClick={() => setSelectedMethod(method)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingMethod(true)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openConfirm(
                        t('payment_methods_admin.confirm.delete_title'),
                        t('payment_methods_admin.confirm.delete_description', { name: method.name }),
                        t('common.delete'),
                        () => handleDeleteMethod(method.id),
                        true,
                      )}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('payment_methods_admin.settings_title')}</CardTitle>
              <CardDescription>{t('payment_methods_admin.settings_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('payment_methods_admin.auto_retry')}</Label>
                  <p className="text-sm text-muted-foreground">{t('payment_methods_admin.auto_retry_description')}</p>
                </div>
                <Switch
                  checked={settings.autoRetry}
                  onCheckedChange={(checked) => setSettings({...settings, autoRetry: checked})}
                />
              </div>

              {settings.autoRetry && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <Label>{t('payment_methods_admin.retry_attempts')}</Label>
                    <Select value={settings.retryAttempts.toString()} onValueChange={(value) => setSettings({...settings, retryAttempts: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('payment_methods_admin.retry_attempts_option', { count: 1 })}</SelectItem>
                        <SelectItem value="2">{t('payment_methods_admin.retry_attempts_option', { count: 2 })}</SelectItem>
                        <SelectItem value="3">{t('payment_methods_admin.retry_attempts_option', { count: 3 })}</SelectItem>
                        <SelectItem value="5">{t('payment_methods_admin.retry_attempts_option', { count: 5 })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('payment_methods_admin.retry_delay')}</Label>
                    <Select value={settings.retryDelay.toString()} onValueChange={(value) => setSettings({...settings, retryDelay: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('payment_methods_admin.retry_hours_option', { count: 1 })}</SelectItem>
                        <SelectItem value="6">{t('payment_methods_admin.retry_hours_option', { count: 6 })}</SelectItem>
                        <SelectItem value="24">{t('payment_methods_admin.retry_hours_option', { count: 24 })}</SelectItem>
                        <SelectItem value="72">{t('payment_methods_admin.retry_hours_option', { count: 72 })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('payment_methods_admin.send_receipts')}</Label>
                  <p className="text-sm text-muted-foreground">{t('payment_methods_admin.send_receipts_description')}</p>
                </div>
                <Switch
                  checked={settings.sendReceipts}
                  onCheckedChange={(checked) => setSettings({...settings, sendReceipts: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('payment_methods_admin.require_cvv')}</Label>
                  <p className="text-sm text-muted-foreground">{t('payment_methods_admin.require_cvv_description')}</p>
                </div>
                <Switch
                  checked={settings.requireCVV}
                  onCheckedChange={(checked) => setSettings({...settings, requireCVV: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('payment_methods_admin.save_payment_methods')}</Label>
                  <p className="text-sm text-muted-foreground">{t('payment_methods_admin.save_payment_methods_description')}</p>
                </div>
                <Switch
                  checked={settings.savePaymentMethods}
                  onCheckedChange={(checked) => setSettings({...settings, savePaymentMethods: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('payment_methods_admin.fee_comparison_title')}</CardTitle>
              <CardDescription>{t('payment_methods_admin.fee_comparison_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('payment_methods_admin.fees_table.method')}</TableHead>
                    <TableHead>{t('payment_methods_admin.fees_table.fixed_fee')}</TableHead>
                    <TableHead>{t('payment_methods_admin.fees_table.percentage')}</TableHead>
                    <TableHead>{t('payment_methods_admin.fees_table.min_amount')}</TableHead>
                    <TableHead>{t('payment_methods_admin.fees_table.max_amount')}</TableHead>
                    <TableHead>{t('payment_methods_admin.fees_table.daily_limit')}</TableHead>
                    <TableHead>{t('payment_methods_admin.fees_table.processing_time')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(method.type)}
                          {method.name}
                        </div>
                      </TableCell>
                      <TableCell>${method.fees.fixed}</TableCell>
                      <TableCell>{method.fees.percentage}%</TableCell>
                      <TableCell>${method.limits.min}</TableCell>
                      <TableCell>${method.limits.max.toLocaleString()}</TableCell>
                      <TableCell>${method.limits.daily.toLocaleString()}</TableCell>
                      <TableCell>{method.processingTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('payment_methods_admin.security_title')}</CardTitle>
              <CardDescription>{t('payment_methods_admin.security_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('payment_methods_admin.two_factor')}</Label>
                  <p className="text-sm text-muted-foreground">{t('payment_methods_admin.two_factor_description')}</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings({...settings, twoFactorAuth: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('payment_methods_admin.fraud_detection')}</Label>
                  <p className="text-sm text-muted-foreground">{t('payment_methods_admin.fraud_detection_description')}</p>
                </div>
                <Switch
                  checked={settings.fraudDetection}
                  onCheckedChange={(checked) => setSettings({...settings, fraudDetection: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('payment_methods_admin.ip_whitelist')}</Label>
                  <p className="text-sm text-muted-foreground">{t('payment_methods_admin.ip_whitelist_description')}</p>
                </div>
                <Switch
                  checked={settings.ipWhitelist}
                  onCheckedChange={(checked) => setSettings({...settings, ipWhitelist: checked})}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('payment_methods_admin.security_features_by_method')}
                </h3>
                <div className="grid gap-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        {getMethodIcon(method.type)}
                        <h4 className="font-medium">{method.name}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {method.securityFeatures.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-green-600 border-green-600">
                            <Lock className="h-3 w-3 mr-1" />
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
      </motion.div>


      {selectedMethod && (
        <Dialog open={!!selectedMethod} onOpenChange={() => setSelectedMethod(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getMethodIcon(selectedMethod.type)}
                {selectedMethod.name}
              </DialogTitle>
              <DialogDescription>{t('payment_methods_admin.method_detail_description')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('payment_methods_admin.provider')}</Label>
                  <p className="font-medium">{selectedMethod.provider}</p>
                </div>
                <div>
                  <Label>{t('payment_methods_admin.type')}</Label>
                  <p className="font-medium capitalize">{selectedMethod.type.replace('_', ' ')}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">{t('payment_methods_admin.detail.fees_limits')}</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-sm">{t('payment_methods_admin.detail.transaction_fee')}</Label>
                    <p>{selectedMethod.fees.percentage}% + ${selectedMethod.fees.fixed}</p>
                  </div>
                  <div>
                    <Label className="text-sm">{t('payment_methods_admin.detail.processing_time')}</Label>
                    <p>{selectedMethod.processingTime}</p>
                  </div>
                  <div>
                    <Label className="text-sm">{t('payment_methods_admin.detail.min_max_amount')}</Label>
                    <p>${selectedMethod.limits.min} - ${selectedMethod.limits.max.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm">{t('payment_methods_admin.detail.daily_limit')}</Label>
                    <p>${selectedMethod.limits.daily.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">{t('payment_methods_admin.detail.supported_regions')}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMethod.countries.map((country) => (
                    <Badge key={country} variant="outline">{country}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">{t('payment_methods_admin.detail.supported_currencies')}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMethod.currencies.map((currency) => (
                    <Badge key={currency} variant="outline">{currency}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">{t('payment_methods_admin.detail.security_features')}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMethod.securityFeatures.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-green-600 border-green-600">
                      <Lock className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </motion.div>
  )
}
