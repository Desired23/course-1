import React, { useState, useEffect } from 'react'
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



export function PaymentMethodsPage() {
  const { canAccess } = useAuth()
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
            <p>You don't have permission to manage payment methods.</p>
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
      toast.success('Phương thức thanh toán đã được thêm')
      setIsAddMethodOpen(false)
      setNewMethod({ name: '', type: 'credit_card', provider: '', apiKey: '', secretKey: '', webhookUrl: '' })
    } catch { toast.error('Thao tác thất bại') }
  }

  const handleToggleMethod = async (methodId: string) => {
    const updated = paymentMethods.map(m => m.id === methodId ? { ...m, isActive: !m.isActive } : m)
    try {
      const value = JSON.stringify(updated)
      if (methodsSettingId) await updateSystemSetting(methodsSettingId, { value })
      setPaymentMethods(updated)
      toast.success('Cập nhật thành công')
    } catch { toast.error('Thao tác thất bại') }
  }

  const handleDeleteMethod = async (methodId: string) => {
    const updated = paymentMethods.filter(m => m.id !== methodId)
    try {
      const value = JSON.stringify(updated)
      if (methodsSettingId) await updateSystemSetting(methodsSettingId, { value })
      setPaymentMethods(updated)
      toast.success('Đã xóa phương thức thanh toán')
    } catch { toast.error('Thao tác thất bại') }
  }

  const handleSaveSettings = async () => {
    try {
      const value = JSON.stringify(settings)
      if (settingsSettingId) { await updateSystemSetting(settingsSettingId, { value }) }
      else { const c = await createSystemSetting({ key: 'payment_settings_config', value }); setSettingsSettingId(c.id) }
      toast.success('Cài đặt đã lưu thành công')
    } catch { toast.error('Lưu thất bại') }
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">Manage payment processors and gateway settings</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Dialog open={isAddMethodOpen} onOpenChange={setIsAddMethodOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>Configure a new payment processor</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Method Name</Label>
                    <Input
                      value={newMethod.name}
                      onChange={(e) => setNewMethod({...newMethod, name: e.target.value})}
                      placeholder="e.g., Stripe Credit Cards"
                    />
                  </div>
                  <div>
                    <Label>Payment Type</Label>
                    <Select value={newMethod.type} onValueChange={(value) => setNewMethod({...newMethod, type: value as PaymentMethod['type']})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="apple_pay">Apple Pay</SelectItem>
                        <SelectItem value="google_pay">Google Pay</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Provider</Label>
                  <Input
                    value={newMethod.provider}
                    onChange={(e) => setNewMethod({...newMethod, provider: e.target.value})}
                    placeholder="e.g., Stripe, PayPal, Square"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showApiKeys ? 'text' : 'password'}
                        value={newMethod.apiKey}
                        onChange={(e) => setNewMethod({...newMethod, apiKey: e.target.value})}
                        placeholder="Enter API key"
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
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      value={newMethod.secretKey}
                      onChange={(e) => setNewMethod({...newMethod, secretKey: e.target.value})}
                      placeholder="Enter secret key"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={newMethod.webhookUrl}
                    onChange={(e) => setNewMethod({...newMethod, webhookUrl: e.target.value})}
                    placeholder="https://yoursite.com/webhooks/payment"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddMethodOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddMethod}>
                    Add Method
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="fees">Fees & Limits</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Payment Methods</CardTitle>
              <CardDescription>Manage your payment processors and gateways</CardDescription>
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
                          {method.isDefault && <Badge variant="default">Default</Badge>}
                          {method.isVerified ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Provider: {method.provider}</span>
                          <span>Fee: {method.fees.percentage}% + ${method.fees.fixed}</span>
                          <span>Processing: {method.processingTime}</span>
                          {method.lastUsed && (
                            <span>Last used: {method.lastUsed.toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={method.isActive}
                        onCheckedChange={() => handleToggleMethod(method.id)}
                      />
                      <Button size="sm" variant="outline" onClick={() => setSelectedMethod(method)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingMethod(true)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteMethod(method.id)}>
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
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure payment processing behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Auto Retry Failed Payments</Label>
                  <p className="text-sm text-muted-foreground">Automatically retry failed payment attempts</p>
                </div>
                <Switch
                  checked={settings.autoRetry}
                  onCheckedChange={(checked) => setSettings({...settings, autoRetry: checked})}
                />
              </div>
              
              {settings.autoRetry && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <Label>Retry Attempts</Label>
                    <Select value={settings.retryAttempts.toString()} onValueChange={(value) => setSettings({...settings, retryAttempts: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 attempt</SelectItem>
                        <SelectItem value="2">2 attempts</SelectItem>
                        <SelectItem value="3">3 attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Retry Delay (hours)</Label>
                    <Select value={settings.retryDelay.toString()} onValueChange={(value) => setSettings({...settings, retryDelay: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="72">72 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Send Email Receipts</Label>
                  <p className="text-sm text-muted-foreground">Automatically send payment receipts to customers</p>
                </div>
                <Switch
                  checked={settings.sendReceipts}
                  onCheckedChange={(checked) => setSettings({...settings, sendReceipts: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Require CVV</Label>
                  <p className="text-sm text-muted-foreground">Always require CVV verification for card payments</p>
                </div>
                <Switch
                  checked={settings.requireCVV}
                  onCheckedChange={(checked) => setSettings({...settings, requireCVV: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Save Payment Methods</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to save payment methods for future use</p>
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
              <CardTitle>Fee Comparison</CardTitle>
              <CardDescription>Compare fees and limits across payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Fixed Fee</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Min Amount</TableHead>
                    <TableHead>Max Amount</TableHead>
                    <TableHead>Daily Limit</TableHead>
                    <TableHead>Processing Time</TableHead>
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
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure payment security and fraud prevention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for payment configuration changes</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings({...settings, twoFactorAuth: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Fraud Detection</Label>
                  <p className="text-sm text-muted-foreground">Enable automatic fraud detection and prevention</p>
                </div>
                <Switch
                  checked={settings.fraudDetection}
                  onCheckedChange={(checked) => setSettings({...settings, fraudDetection: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">IP Whitelist</Label>
                  <p className="text-sm text-muted-foreground">Restrict payment processing to specific IP addresses</p>
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
                  Security Features by Method
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

      {/* Method Details Dialog */}
      {selectedMethod && (
        <Dialog open={!!selectedMethod} onOpenChange={() => setSelectedMethod(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getMethodIcon(selectedMethod.type)}
                {selectedMethod.name}
              </DialogTitle>
              <DialogDescription>Payment method details and configuration</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Provider</Label>
                  <p className="font-medium">{selectedMethod.provider}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="font-medium capitalize">{selectedMethod.type.replace('_', ' ')}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-base font-semibold">Fees & Limits</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-sm">Transaction Fee</Label>
                    <p>{selectedMethod.fees.percentage}% + ${selectedMethod.fees.fixed}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Processing Time</Label>
                    <p>{selectedMethod.processingTime}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Min/Max Amount</Label>
                    <p>${selectedMethod.limits.min} - ${selectedMethod.limits.max.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Daily Limit</Label>
                    <p>${selectedMethod.limits.daily.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-base font-semibold">Supported Regions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMethod.countries.map((country) => (
                    <Badge key={country} variant="outline">{country}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-semibold">Supported Currencies</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMethod.currencies.map((currency) => (
                    <Badge key={currency} variant="outline">{currency}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-semibold">Security Features</Label>
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
    </div>
  )
}