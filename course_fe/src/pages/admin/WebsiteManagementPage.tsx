import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import { Switch } from '../../components/ui/switch'
import { 
  Upload, 
  Image, 
  Settings, 
  Palette, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Save,
  Eye,
  Edit,
  Trash2,
  Plus,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react'
import { toast } from 'sonner'
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'

interface WebsiteConfig {
  general: {
    siteName: string
    tagline: string
    description: string
    logo: string
    favicon: string
    metaKeywords: string
  }
  contact: {
    email: string
    phone: string
    address: string
    workingHours: string
    socialMedia: {
      facebook: string
      twitter: string
      linkedin: string
      instagram: string
      youtube: string
    }
  }
  banners: {
    hero: {
      title: string
      subtitle: string
      image: string
      ctaText: string
      ctaLink: string
      enabled: boolean
    }
    promotional: {
      title: string
      content: string
      image: string
      discount: string
      enabled: boolean
      expiryDate: string
    }
    announcement: {
      text: string
      type: 'info' | 'warning' | 'success' | 'error'
      enabled: boolean
      dismissible: boolean
    }
  }
  appearance: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    font: string
    theme: 'light' | 'dark' | 'auto'
  }
  features: {
    enableChat: boolean
    enableNotifications: boolean
    enableComments: boolean
    enableRatings: boolean
    enableSocialLogin: boolean
    maintenanceMode: boolean
  }
}

export function WebsiteManagementPage() {
  const { hasPermission } = useAuth()
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [websiteSettingId, setWebsiteSettingId] = useState<number | null>(null)

  const defaultConfig: WebsiteConfig = {
    general: {
      siteName: 'UdemyClone',
      tagline: 'Learn Without Limits',
      description: 'The ultimate online learning platform with thousands of courses',
      logo: '',
      favicon: '',
      metaKeywords: 'online learning, courses, education, skills, udemy'
    },
    contact: {
      email: '',
      phone: '',
      address: '',
      workingHours: '',
      socialMedia: { facebook: '', twitter: '', linkedin: '', instagram: '', youtube: '' }
    },
    banners: {
      hero: { title: '', subtitle: '', image: '', ctaText: '', ctaLink: '', enabled: false },
      promotional: { title: '', content: '', image: '', discount: '', enabled: false, expiryDate: '' },
      announcement: { text: '', type: 'info', enabled: false, dismissible: true }
    },
    appearance: {
      primaryColor: '#0f172a',
      secondaryColor: '#64748b',
      accentColor: '#3b82f6',
      font: 'Inter',
      theme: 'light'
    },
    features: {
      enableChat: true,
      enableNotifications: true,
      enableComments: true,
      enableRatings: true,
      enableSocialLogin: true,
      maintenanceMode: false
    }
  }

  const [config, setConfig] = useState<WebsiteConfig>(defaultConfig)

  useEffect(() => {
    async function load() {
      try {
        const settings = await getSystemSettings()
        const ws = settings.find(s => s.key === 'website_management')
        if (ws) {
          setWebsiteSettingId(ws.id)
          try {
            const parsed = JSON.parse(ws.value)
            setConfig({ ...defaultConfig, ...parsed })
          } catch { /* keep defaults */ }
        }
      } catch (e) {
        console.error('Failed to load website settings', e)
      }
    }
    load()
  }, [])

  if (!hasPermission('admin.website.manage')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-muted-foreground">
              You don't have permission to manage website settings.
            </p>
            <p className="text-sm text-muted-foreground">
              Required permission: admin.website.manage
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSave = async () => {
    try {
      const payload = { key: 'website_management', value: JSON.stringify(config), description: 'Website management config' }
      if (websiteSettingId) {
        await updateSystemSetting(websiteSettingId, { value: payload.value })
      } else {
        const created = await createSystemSetting(payload)
        setWebsiteSettingId(created.id)
      }
      toast.success('Website settings saved successfully!')
    } catch (e) {
      toast.error('Failed to save settings')
    }
  }

  const handleImageUpload = (field: string, category: string) => {
    toast.info('Image upload feature coming soon')
  }

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return <Monitor className="w-4 h-4" />
      case 'tablet': return <Tablet className="w-4 h-4" />
      case 'mobile': return <Smartphone className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">Website Management</h1>
            <p className="text-muted-foreground">
              Customize your website appearance, content, and functionality
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Device Preview Toggles */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
                <Button
                  key={device}
                  variant={activeDevice === device ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveDevice(device)}
                >
                  {getDeviceIcon(device)}
                </Button>
              ))}
            </div>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={config.general.siteName}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        general: { ...prev.general, siteName: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={config.general.tagline}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        general: { ...prev.general, tagline: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={config.general.description}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        general: { ...prev.general, description: e.target.value }
                      }))}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="keywords">Meta Keywords</Label>
                    <Input
                      id="keywords"
                      value={config.general.metaKeywords}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        general: { ...prev.general, metaKeywords: e.target.value }
                      }))}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      <img 
                        src={config.general.logo} 
                        alt="Logo" 
                        className="h-12 w-auto rounded border"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => handleImageUpload('logo', 'general')}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Favicon</Label>
                    <div className="flex items-center gap-4">
                      <img 
                        src={config.general.favicon} 
                        alt="Favicon" 
                        className="h-8 w-8 rounded border"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => handleImageUpload('favicon', 'general')}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Favicon
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banner Management */}
          <TabsContent value="banners" className="space-y-6">
            {/* Hero Banner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Hero Banner
                  </CardTitle>
                  <Switch
                    checked={config.banners.hero.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      banners: {
                        ...prev.banners,
                        hero: { ...prev.banners.hero, enabled: checked }
                      }
                    }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={config.banners.hero.title}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        banners: {
                          ...prev.banners,
                          hero: { ...prev.banners.hero, title: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Subtitle</Label>
                    <Textarea
                      value={config.banners.hero.subtitle}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        banners: {
                          ...prev.banners,
                          hero: { ...prev.banners.hero, subtitle: e.target.value }
                        }
                      }))}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CTA Text</Label>
                      <Input
                        value={config.banners.hero.ctaText}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          banners: {
                            ...prev.banners,
                            hero: { ...prev.banners.hero, ctaText: e.target.value }
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label>CTA Link</Label>
                      <Input
                        value={config.banners.hero.ctaLink}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          banners: {
                            ...prev.banners,
                            hero: { ...prev.banners.hero, ctaLink: e.target.value }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Hero Image</Label>
                  <div className="mt-2">
                    <img 
                      src={config.banners.hero.image} 
                      alt="Hero" 
                      className="w-full h-40 object-cover rounded border mb-4"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleImageUpload('image', 'banners.hero')}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Promotional Banner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Promotional Banner</CardTitle>
                  <Switch
                    checked={config.banners.promotional.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      banners: {
                        ...prev.banners,
                        promotional: { ...prev.banners.promotional, enabled: checked }
                      }
                    }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={config.banners.promotional.title}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        banners: {
                          ...prev.banners,
                          promotional: { ...prev.banners.promotional, title: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={config.banners.promotional.content}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        banners: {
                          ...prev.banners,
                          promotional: { ...prev.banners.promotional, content: e.target.value }
                        }
                      }))}
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount</Label>
                      <Input
                        value={config.banners.promotional.discount}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          banners: {
                            ...prev.banners,
                            promotional: { ...prev.banners.promotional, discount: e.target.value }
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={config.banners.promotional.expiryDate}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          banners: {
                            ...prev.banners,
                            promotional: { ...prev.banners.promotional, expiryDate: e.target.value }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Promotional Image</Label>
                  <div className="mt-2">
                    <img 
                      src={config.banners.promotional.image} 
                      alt="Promotional" 
                      className="w-full h-32 object-cover rounded border mb-4"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleImageUpload('image', 'banners.promotional')}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Announcement Banner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Announcement Banner</CardTitle>
                  <Switch
                    checked={config.banners.announcement.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      banners: {
                        ...prev.banners,
                        announcement: { ...prev.banners.announcement, enabled: checked }
                      }
                    }))}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Announcement Text</Label>
                    <Textarea
                      value={config.banners.announcement.text}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        banners: {
                          ...prev.banners,
                          announcement: { ...prev.banners.announcement, text: e.target.value }
                        }
                      }))}
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Type</Label>
                      <select 
                        className="w-full p-2 border rounded"
                        value={config.banners.announcement.type}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          banners: {
                            ...prev.banners,
                            announcement: { 
                              ...prev.banners.announcement, 
                              type: e.target.value as 'info' | 'warning' | 'success' | 'error'
                            }
                          }
                        }))}
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dismissible"
                        checked={config.banners.announcement.dismissible}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          banners: {
                            ...prev.banners,
                            announcement: { ...prev.banners.announcement, dismissible: checked }
                          }
                        }))}
                      />
                      <Label htmlFor="dismissible">Dismissible</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={config.contact.email}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        contact: { ...prev.contact, email: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={config.contact.phone}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        contact: { ...prev.contact, phone: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Address</Label>
                    <Textarea
                      value={config.contact.address}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        contact: { ...prev.contact, address: e.target.value }
                      }))}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label>Working Hours</Label>
                    <Input
                      value={config.contact.workingHours}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        contact: { ...prev.contact, workingHours: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Social Media Links</h3>
                  
                  {Object.entries(config.contact.socialMedia).map(([platform, url]) => (
                    <div key={platform}>
                      <Label className="capitalize">{platform}</Label>
                      <Input
                        value={url}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          contact: {
                            ...prev.contact,
                            socialMedia: {
                              ...prev.contact.socialMedia,
                              [platform]: e.target.value
                            }
                          }
                        }))}
                        placeholder={`https://${platform}.com/yourpage`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Theme & Colors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={config.appearance.primaryColor}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, primaryColor: e.target.value }
                        }))}
                        className="w-10 h-10 rounded border"
                      />
                      <Input
                        value={config.appearance.primaryColor}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, primaryColor: e.target.value }
                        }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={config.appearance.secondaryColor}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, secondaryColor: e.target.value }
                        }))}
                        className="w-10 h-10 rounded border"
                      />
                      <Input
                        value={config.appearance.secondaryColor}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, secondaryColor: e.target.value }
                        }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={config.appearance.accentColor}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, accentColor: e.target.value }
                        }))}
                        className="w-10 h-10 rounded border"
                      />
                      <Input
                        value={config.appearance.accentColor}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          appearance: { ...prev.appearance, accentColor: e.target.value }
                        }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Font Family</Label>
                    <select 
                      className="w-full p-2 border rounded mt-1"
                      value={config.appearance.font}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, font: e.target.value }
                      }))}
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                      <option value="Poppins">Poppins</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Default Theme</Label>
                    <select 
                      className="w-full p-2 border rounded mt-1"
                      value={config.appearance.theme}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, theme: e.target.value as 'light' | 'dark' | 'auto' }
                      }))}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature Toggles */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Platform Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(config.features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="capitalize font-medium">
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getFeatureDescription(feature)}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          features: { ...prev.features, [feature]: checked }
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`border rounded-lg overflow-hidden ${getDeviceClass(activeDevice)}`}>
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 text-center">
                    <h1 className="text-3xl font-bold mb-2">{config.banners.hero.title}</h1>
                    <p className="text-lg opacity-90 mb-4">{config.banners.hero.subtitle}</p>
                    <Button className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {config.banners.hero.ctaText}
                    </Button>
                  </div>
                  
                  {config.banners.announcement.enabled && (
                    <div className={`p-3 text-center text-sm ${getAnnouncementClass(config.banners.announcement.type)}`}>
                      {config.banners.announcement.text}
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Welcome to {config.general.siteName}</h2>
                    <p className="text-muted-foreground mb-4">{config.general.description}</p>
                    
                    {config.banners.promotional.enabled && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold text-yellow-800">{config.banners.promotional.title}</h3>
                        <p className="text-yellow-700">{config.banners.promotional.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    enableChat: 'Allow real-time chat between users',
    enableNotifications: 'Send push notifications to users',
    enableComments: 'Allow comments on courses and posts',
    enableRatings: 'Allow users to rate courses',
    enableSocialLogin: 'Allow login with social media accounts',
    maintenanceMode: 'Put the site in maintenance mode'
  }
  return descriptions[feature] || 'Toggle this feature on or off'
}

function getDeviceClass(device: string): string {
  switch (device) {
    case 'mobile': return 'max-w-sm mx-auto'
    case 'tablet': return 'max-w-2xl mx-auto'
    case 'desktop': return 'w-full'
    default: return 'w-full'
  }
}

function getAnnouncementClass(type: string): string {
  switch (type) {
    case 'info': return 'bg-blue-50 text-blue-800 border-blue-200'
    case 'warning': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
    case 'success': return 'bg-green-50 text-green-800 border-green-200'
    case 'error': return 'bg-red-50 text-red-800 border-red-200'
    default: return 'bg-gray-50 text-gray-800 border-gray-200'
  }
}