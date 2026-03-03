import React, { useState, useEffect } from 'react'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Settings, DollarSign, Shield, Mail, Bell, Database, Users, CreditCard, FileText, Globe, Save, Plus, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'


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



export function PlatformSettingsPage() {
  const { canAccess } = useAuth()
  const [platformSettingId, setPlatformSettingId] = useState<number | null>(null)
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', name: 'Stripe', type: 'card', enabled: true, fees: 2.9, processingTime: 'Instant' },
    { id: '2', name: 'PayPal', type: 'wallet', enabled: true, fees: 3.5, processingTime: 'Instant' },
    { id: '3', name: 'Bank Transfer', type: 'bank', enabled: false, fees: 1.0, processingTime: '3-5 days' },
    { id: '4', name: 'Apple Pay', type: 'wallet', enabled: true, fees: 2.9, processingTime: 'Instant' },
    { id: '5', name: 'Google Pay', type: 'wallet', enabled: true, fees: 2.9, processingTime: 'Instant' }
  ])

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
            <p>You don't have permission to access platform settings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSaveSettings = async () => {
    try {
      const value = JSON.stringify(settings)
      if (platformSettingId) {
        await updateSystemSetting(platformSettingId, { value })
      } else {
        const created = await createSystemSetting({ key: 'platform_settings', value })
        setPlatformSettingId(created.id)
      }
      toast.success('Cài đặt đã lưu thành công')
    } catch {
      toast.error('Lưu thất bại')
    }
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
    <div className="p-6 space-y-6 overflow-x-hidden">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Configure your platform settings and policies</p>
        </div>
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Information
              </CardTitle>
              <CardDescription>Basic platform configuration and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) => updateSettings('general', 'siteName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={settings.general.siteUrl}
                    onChange={(e) => updateSettings('general', 'siteUrl', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.general.siteDescription}
                  onChange={(e) => updateSettings('general', 'siteDescription', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => updateSettings('general', 'supportEmail', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <Select value={settings.general.defaultLanguage} onValueChange={(value) => updateSettings('general', 'defaultLanguage', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="vi">Vietnamese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings.general.logoUrl}
                    onChange={(e) => updateSettings('general', 'logoUrl', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.general.timezone} onValueChange={(value) => updateSettings('general', 'timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Ho_Chi_Minh">Ho Chi Minh City</SelectItem>
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
                Financial Settings
              </CardTitle>
              <CardDescription>Configure commission rates, payouts, and payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commissionPercentage">Commission Percentage (%)</Label>
                  <Input
                    id="commissionPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.financial.commissionPercentage}
                    onChange={(e) => updateSettings('financial', 'commissionPercentage', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Platform commission on each sale</p>
                </div>
                <div>
                  <Label htmlFor="payoutMinimum">Minimum Payout ($)</Label>
                  <Input
                    id="payoutMinimum"
                    type="number"
                    min="0"
                    value={settings.financial.payoutMinimum}
                    onChange={(e) => updateSettings('financial', 'payoutMinimum', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minimum amount for instructor payouts</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="refundPeriod">Refund Period (days)</Label>
                  <Input
                    id="refundPeriod"
                    type="number"
                    min="0"
                    value={settings.financial.refundPeriod}
                    onChange={(e) => updateSettings('financial', 'refundPeriod', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
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
                  <Label htmlFor="currency">Currency</Label>
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
                    <h3 className="text-lg font-semibold">Payment Methods</h3>
                    <p className="text-sm text-muted-foreground">Configure available payment options</p>
                  </div>
                  <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Method
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Payment Method</DialogTitle>
                        <DialogDescription>Configure a new payment method for your platform</DialogDescription>
                      </DialogHeader>
                      {/* Payment method form would go here */}
                    </DialogContent>
                  </Dialog>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fees (%)</TableHead>
                      <TableHead>Processing Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {method.type === 'card' && <CreditCard className="h-3 w-3 mr-1" />}
                            {method.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{method.fees}%</TableCell>
                        <TableCell>{method.processingTime}</TableCell>
                        <TableCell>
                          <Badge variant={method.enabled ? 'default' : 'secondary'}>
                            {method.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
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
                Platform Policies
              </CardTitle>
              <CardDescription>Legal documents and community guidelines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="termsOfService">Terms of Service</Label>
                <Textarea
                  id="termsOfService"
                  value={settings.policies.termsOfService}
                  onChange={(e) => updateSettings('policies', 'termsOfService', e.target.value)}
                  rows={8}
                  placeholder="Enter your terms of service..."
                />
              </div>
              
              <div>
                <Label htmlFor="privacyPolicy">Privacy Policy</Label>
                <Textarea
                  id="privacyPolicy"
                  value={settings.policies.privacyPolicy}
                  onChange={(e) => updateSettings('policies', 'privacyPolicy', e.target.value)}
                  rows={8}
                  placeholder="Enter your privacy policy..."
                />
              </div>
              
              <div>
                <Label htmlFor="refundPolicy">Refund Policy</Label>
                <Textarea
                  id="refundPolicy"
                  value={settings.policies.refundPolicy}
                  onChange={(e) => updateSettings('policies', 'refundPolicy', e.target.value)}
                  rows={6}
                  placeholder="Enter your refund policy..."
                />
              </div>
              
              <div>
                <Label htmlFor="communityGuidelines">Community Guidelines</Label>
                <Textarea
                  id="communityGuidelines"
                  value={settings.policies.communityGuidelines}
                  onChange={(e) => updateSettings('policies', 'communityGuidelines', e.target.value)}
                  rows={6}
                  placeholder="Enter community guidelines..."
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
                Platform Features
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>User Registration</Label>
                    <p className="text-sm text-muted-foreground">Allow new users to register</p>
                  </div>
                  <Switch
                    checked={settings.features.allowUserRegistration}
                    onCheckedChange={(checked) => updateSettings('features', 'allowUserRegistration', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Verification</Label>
                    <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
                  </div>
                  <Switch
                    checked={settings.features.requireEmailVerification}
                    onCheckedChange={(checked) => updateSettings('features', 'requireEmailVerification', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Course Reviews</Label>
                    <p className="text-sm text-muted-foreground">Allow students to review courses</p>
                  </div>
                  <Switch
                    checked={settings.features.enableCourseReviews}
                    onCheckedChange={(checked) => updateSettings('features', 'enableCourseReviews', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Q&A Section</Label>
                    <p className="text-sm text-muted-foreground">Enable Q&A for courses</p>
                  </div>
                  <Switch
                    checked={settings.features.enableQA}
                    onCheckedChange={(checked) => updateSettings('features', 'enableQA', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Blog Posts</Label>
                    <p className="text-sm text-muted-foreground">Allow instructors to create blog posts</p>
                  </div>
                  <Switch
                    checked={settings.features.enableBlog}
                    onCheckedChange={(checked) => updateSettings('features', 'enableBlog', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Certificates</Label>
                    <p className="text-sm text-muted-foreground">Generate completion certificates</p>
                  </div>
                  <Switch
                    checked={settings.features.enableCertificates}
                    onCheckedChange={(checked) => updateSettings('features', 'enableCertificates', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Discussions</Label>
                    <p className="text-sm text-muted-foreground">Enable course discussions</p>
                  </div>
                  <Switch
                    checked={settings.features.enableDiscussions}
                    onCheckedChange={(checked) => updateSettings('features', 'enableDiscussions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Live Streaming</Label>
                    <p className="text-sm text-muted-foreground">Allow live streaming sessions</p>
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
                Notification Settings
              </CardTitle>
              <CardDescription>Configure platform notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send browser push notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'pushNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.notifications.smsNotifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'smsNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Send promotional and marketing emails</p>
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
                Security Settings
              </CardTitle>
              <CardDescription>Configure platform security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
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
                  <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
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
                <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min="3"
                  max="10"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum failed login attempts before account lockout</p>
              </div>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Strong Password Required</Label>
                    <p className="text-sm text-muted-foreground">Require passwords with special characters and numbers</p>
                  </div>
                  <Switch
                    checked={settings.security.requireStrongPassword}
                    onCheckedChange={(checked) => updateSettings('security', 'requireStrongPassword', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Enable 2FA for enhanced security</p>
                  </div>
                  <Switch
                    checked={settings.security.enableTwoFactor}
                    onCheckedChange={(checked) => updateSettings('security', 'enableTwoFactor', checked)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="ipWhitelist">IP Whitelist</Label>
                <Textarea
                  id="ipWhitelist"
                  placeholder="Enter IP addresses (one per line) to restrict admin access"
                  value={settings.security.ipWhitelist.join('\n')}
                  onChange={(e) => updateSettings('security', 'ipWhitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to allow access from any IP</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}