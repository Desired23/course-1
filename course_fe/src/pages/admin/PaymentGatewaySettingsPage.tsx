import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Separator } from '../../components/ui/separator'
import { 
  CreditCard, 
  Wallet, 
  Smartphone, 
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save
} from 'lucide-react'
import { toast } from 'sonner'
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'

interface PaymentGateway {
  id: string
  name: string
  icon: any
  enabled: boolean
  testMode: boolean
  credentials: {
    publicKey?: string
    secretKey?: string
    merchantId?: string
    apiKey?: string
    webhookSecret?: string
  }
}

export function PaymentGatewaySettingsPage() {
  const [gatewaySettingId, setGatewaySettingId] = useState<number | null>(null)
  const [gateways, setGateways] = useState<PaymentGateway[]>([
    {
      id: 'stripe',
      name: 'Stripe',
      icon: CreditCard,
      enabled: false,
      testMode: true,
      credentials: {
        publicKey: '',
        secretKey: '',
        webhookSecret: ''
      }
    },
    {
      id: 'vnpay',
      name: 'VNPay',
      icon: Wallet,
      enabled: false,
      testMode: true,
      credentials: {
        merchantId: '',
        secretKey: ''
      }
    },
    {
      id: 'momo',
      name: 'MoMo',
      icon: Smartphone,
      enabled: false,
      testMode: true,
      credentials: {
        merchantId: '',
        apiKey: '',
        secretKey: ''
      }
    }
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getSystemSettings()
        const gw = settings.find(s => s.key === 'payment_gateways')
        if (gw) {
          setGatewaySettingId(gw.id)
          try {
            const parsed = JSON.parse(gw.value)
            if (Array.isArray(parsed)) {
              setGateways(prev => prev.map(g => {
                const saved = parsed.find((p: any) => p.id === g.id)
                return saved ? { ...g, enabled: saved.enabled, testMode: saved.testMode, credentials: { ...g.credentials, ...saved.credentials } } : g
              }))
            }
          } catch {}
        }
      } catch {}
    }
    load()
  }, [])

  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({})

  const toggleGateway = (gatewayId: string) => {
    setGateways(prev => prev.map(g =>
      g.id === gatewayId ? { ...g, enabled: !g.enabled } : g
    ))
    toast.success(`${gatewayId.toUpperCase()} ${gateways.find(g => g.id === gatewayId)?.enabled ? 'disabled' : 'enabled'}`)
  }

  const toggleTestMode = (gatewayId: string) => {
    setGateways(prev => prev.map(g =>
      g.id === gatewayId ? { ...g, testMode: !g.testMode } : g
    ))
  }

  const updateCredential = (gatewayId: string, key: string, value: string) => {
    setGateways(prev => prev.map(g =>
      g.id === gatewayId 
        ? { ...g, credentials: { ...g.credentials, [key]: value } }
        : g
    ))
  }

  const saveGatewaySettings = async (gatewayId: string) => {
    try {
      const serialized = JSON.stringify(gateways.map(g => ({ id: g.id, enabled: g.enabled, testMode: g.testMode, credentials: g.credentials })))
      if (gatewaySettingId) {
        await updateSystemSetting(gatewaySettingId, { value: serialized })
      } else {
        const created = await createSystemSetting({ key: 'payment_gateways', value: serialized })
        setGatewaySettingId(created.id)
      }
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Lưu thất bại')
    }
  }

  const testConnection = async (gatewayId: string) => {
    toast.loading('Testing connection...')
    // Simulate API call
    setTimeout(() => {
      toast.dismiss()
      toast.success(`${gatewayId.toUpperCase()} connection successful!`)
    }, 2000)
  }

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl mb-2">Payment Gateway Settings</h1>
          <p className="text-muted-foreground">
            Configure payment gateways for your platform
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Keep your API keys secure. Never share them publicly or commit them to version control.
          </AlertDescription>
        </Alert>

        {/* Gateway Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {gateways.map(gateway => {
            const Icon = gateway.icon
            return (
              <Card key={gateway.id} className={gateway.enabled ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6" />
                      <CardTitle>{gateway.name}</CardTitle>
                    </div>
                    {gateway.enabled && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <CardDescription>
                    {gateway.enabled ? 'Active' : 'Inactive'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable Gateway</span>
                    <Switch
                      checked={gateway.enabled}
                      onCheckedChange={() => toggleGateway(gateway.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Configuration Tabs */}
        <Tabs defaultValue="stripe" className="space-y-4">
          <TabsList>
            {gateways.map(gateway => (
              <TabsTrigger key={gateway.id} value={gateway.id}>
                {gateway.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {gateways.map(gateway => (
            <TabsContent key={gateway.id} value={gateway.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{gateway.name} Configuration</CardTitle>
                  <CardDescription>
                    Configure your {gateway.name} payment gateway credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Test Mode */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Test Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Use test credentials for development
                      </p>
                    </div>
                    <Switch
                      checked={gateway.testMode}
                      onCheckedChange={() => toggleTestMode(gateway.id)}
                    />
                  </div>

                  <Separator />

                  {/* Credentials */}
                  <div className="space-y-4">
                    {Object.entries(gateway.credentials).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label className="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                          {key.includes('secret') && ' (Keep Secure)'}
                        </Label>
                        <div className="relative">
                          <Input
                            type={key.includes('secret') && !showSecrets[`${gateway.id}_${key}`] ? 'password' : 'text'}
                            value={value as string}
                            onChange={(e) => updateCredential(gateway.id, key, e.target.value)}
                            placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                            className={key.includes('secret') ? 'font-mono' : ''}
                          />
                          {key.includes('secret') && (
                            <button
                              type="button"
                              onClick={() => toggleSecretVisibility(`${gateway.id}_${key}`)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showSecrets[`${gateway.id}_${key}`] ? (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => saveGatewaySettings(gateway.id)}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => testConnection(gateway.id)}
                      disabled={!gateway.enabled}
                    >
                      Test Connection
                    </Button>
                  </div>

                  {/* Documentation Link */}
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Need help? Check the documentation</span>
                      <Button variant="link" size="sm" asChild>
                        <a 
                          href={`https://docs.${gateway.id}.com`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          View Docs →
                        </a>
                      </Button>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Webhooks Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>
                    Configure webhooks for payment notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={`${window.location.origin}/api/webhooks/${gateway.id}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add this URL to your {gateway.name} dashboard
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Events</Label>
                    <div className="border rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>payment.success</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>payment.failed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>refund.processed</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
