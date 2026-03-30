import React, { useState, useEffect, useRef } from 'react'
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
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
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
import { uploadFiles } from '../../services/upload.api'
import { useTranslation } from 'react-i18next'

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

function WebsiteImagePreview({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted text-muted-foreground`}>
        <Image className="w-5 h-5" />
      </div>
    )
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
}

export function WebsiteManagementPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [websiteSettingId, setWebsiteSettingId] = useState<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingImageTarget, setPendingImageTarget] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
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
    confirmLabel: t('common.confirm'),
    destructive: false,
    loading: false,
    action: null,
  })

  const defaultConfig: WebsiteConfig = {
    general: {
      siteName: 'UdemyClone',
      tagline: 'Learn Without Limits',
      description: t('website_management.default_site_description'),
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
            <CardTitle className="text-center text-destructive">{t('website_management.access_denied')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-muted-foreground">
              {t('website_management.no_permission')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('website_management.required_permission')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const payload = {
        key: 'website_management',
        value: JSON.stringify(config),
        description: t('website_management.config_description'),
      }
      if (websiteSettingId) {
        await updateSystemSetting(websiteSettingId, { value: payload.value })
      } else {
        const created = await createSystemSetting(payload)
        setWebsiteSettingId(created.id)
      }
      toast.success(t('website_management.save_success'))
    } catch (e) {
      toast.error(t('website_management.save_failed'))
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
        confirmLabel: t('common.confirm'),
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  const updateFeatureToggle = (feature: keyof WebsiteConfig['features'], checked: boolean) => {
    if (feature === 'maintenanceMode' && checked) {
      openConfirm(
        t('website_management.maintenance_confirm_title'),
        t('website_management.maintenance_confirm_description'),
        t('website_management.maintenance_confirm_label'),
        () => {
          setConfig((prev) => ({
            ...prev,
            features: { ...prev.features, maintenanceMode: true },
          }))
          toast.success(t('website_management.maintenance_enabled_notice'))
        },
        true,
      )
      return
    }

    setConfig((prev) => ({
      ...prev,
      features: { ...prev.features, [feature]: checked },
    }))
  }

  const updateImageTarget = (target: string, url: string) => {
    setConfig((prev) => {
      switch (target) {
        case 'general.logo':
          return { ...prev, general: { ...prev.general, logo: url } }
        case 'general.favicon':
          return { ...prev, general: { ...prev.general, favicon: url } }
        case 'banners.hero.image':
          return {
            ...prev,
            banners: {
              ...prev.banners,
              hero: { ...prev.banners.hero, image: url },
            },
          }
        case 'banners.promotional.image':
          return {
            ...prev,
            banners: {
              ...prev.banners,
              promotional: { ...prev.banners.promotional, image: url },
            },
          }
        default:
          return prev
      }
    })
  }

  const openImageUpload = (target: string) => {
    setPendingImageTarget(target)
    imageInputRef.current?.click()
  }

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const target = pendingImageTarget
    event.target.value = ''

    if (!file || !target) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('website_management.invalid_image_file'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('website_management.image_too_large'))
      return
    }

    try {
      setUploadingField(target)
      const uploaded = await uploadFiles([file], { folder: 'website-management', resource_type: 'image' })
      if (!uploaded?.length) {
        throw new Error('Upload failed')
      }
      updateImageTarget(target, uploaded[0].url)
      toast.success(t('website_management.upload_success'))
    } catch (error) {
      console.error('Website image upload failed:', error)
      toast.error(t('website_management.upload_failed'))
    } finally {
      setUploadingField(null)
      setPendingImageTarget(null)
    }
  }

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return <Monitor className="w-4 h-4" />
      case 'tablet': return <Tablet className="w-4 h-4" />
      case 'mobile': return <Smartphone className="w-4 h-4" />
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleImageSelected(event)}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">{t('website_management.title')}</h1>
            <p className="text-muted-foreground">
              {t('website_management.subtitle')}
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
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? t('website_management.saving') : t('website_management.save_changes')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">{t('website_management.tab_general')}</TabsTrigger>
            <TabsTrigger value="banners">{t('website_management.tab_banners')}</TabsTrigger>
            <TabsTrigger value="contact">{t('website_management.tab_contact')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('website_management.tab_appearance')}</TabsTrigger>
            <TabsTrigger value="features">{t('website_management.tab_features')}</TabsTrigger>
            <TabsTrigger value="preview">{t('website_management.tab_preview')}</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t('website_management.general_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="siteName">{t('website_management.site_name')}</Label>
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
                    <Label htmlFor="tagline">{t('website_management.tagline')}</Label>
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
                    <Label htmlFor="description">{t('common.description')}</Label>
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
                    <Label htmlFor="keywords">{t('website_management.meta_keywords')}</Label>
                    <Input
                      id="keywords"
                      value={config.general.metaKeywords}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        general: { ...prev.general, metaKeywords: e.target.value }
                      }))}
                      placeholder={t('website_management.meta_keywords_placeholder')}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>{t('website_management.logo')}</Label>
                    <div className="flex items-center gap-4">
                      <WebsiteImagePreview
                        src={config.general.logo}
                        alt={t('website_management.logo')}
                        className="h-12 w-24 rounded border object-contain"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => openImageUpload('general.logo')}
                        disabled={uploadingField === 'general.logo'}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingField === 'general.logo' ? t('website_management.uploading') : t('website_management.upload_logo')}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>{t('website_management.favicon')}</Label>
                    <div className="flex items-center gap-4">
                      <WebsiteImagePreview
                        src={config.general.favicon}
                        alt={t('website_management.favicon')}
                        className="h-8 w-8 rounded border object-contain"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => openImageUpload('general.favicon')}
                        disabled={uploadingField === 'general.favicon'}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingField === 'general.favicon' ? t('website_management.uploading') : t('website_management.upload_favicon')}
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
                    {t('website_management.hero_banner')}
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
                    <Label>{t('common.title')}</Label>
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
                    <Label>{t('website_management.subtitle_label')}</Label>
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
                      <Label>{t('website_management.cta_text')}</Label>
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
                      <Label>{t('website_management.cta_link')}</Label>
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
                  <Label>{t('website_management.hero_image')}</Label>
                  <div className="mt-2">
                    <WebsiteImagePreview
                      src={config.banners.hero.image}
                      alt={t('website_management.hero_banner')}
                      className="w-full h-40 object-cover rounded border mb-4"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => openImageUpload('banners.hero.image')}
                      disabled={uploadingField === 'banners.hero.image'}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingField === 'banners.hero.image' ? t('website_management.uploading') : t('website_management.upload_image')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Promotional Banner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('website_management.promotional_banner')}</CardTitle>
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
                    <Label>{t('common.title')}</Label>
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
                    <Label>{t('website_management.content')}</Label>
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
                      <Label>{t('website_management.discount')}</Label>
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
                      <Label>{t('website_management.expiry_date')}</Label>
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
                  <Label>{t('website_management.promotional_image')}</Label>
                  <div className="mt-2">
                    <WebsiteImagePreview
                      src={config.banners.promotional.image}
                      alt={t('website_management.promotional_banner')}
                      className="w-full h-32 object-cover rounded border mb-4"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => openImageUpload('banners.promotional.image')}
                      disabled={uploadingField === 'banners.promotional.image'}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingField === 'banners.promotional.image' ? t('website_management.uploading') : t('website_management.upload_image')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Announcement Banner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('website_management.announcement_banner')}</CardTitle>
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
                    <Label>{t('website_management.announcement_text')}</Label>
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
                      <Label>{t('website_management.type')}</Label>
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
                        <option value="info">{t('website_management.announcement_info')}</option>
                        <option value="warning">{t('website_management.announcement_warning')}</option>
                        <option value="success">{t('website_management.announcement_success')}</option>
                        <option value="error">{t('website_management.announcement_error')}</option>
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
                      <Label htmlFor="dismissible">{t('website_management.dismissible')}</Label>
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
                  {t('website_management.contact_information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>{t('auth.email')}</Label>
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
                    <Label>{t('website_management.phone')}</Label>
                    <Input
                      value={config.contact.phone}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        contact: { ...prev.contact, phone: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label>{t('website_management.address')}</Label>
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
                    <Label>{t('website_management.working_hours')}</Label>
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
                  <h3 className="font-medium">{t('website_management.social_media_links')}</h3>
                  
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
                        placeholder={t('website_management.social_placeholder', { platform })}
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
                  {t('website_management.theme_colors')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>{t('website_management.primary_color')}</Label>
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
                    <Label>{t('website_management.secondary_color')}</Label>
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
                    <Label>{t('website_management.accent_color')}</Label>
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
                    <Label>{t('website_management.font_family')}</Label>
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
                    <Label>{t('website_management.default_theme')}</Label>
                    <select 
                      className="w-full p-2 border rounded mt-1"
                      value={config.appearance.theme}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, theme: e.target.value as 'light' | 'dark' | 'auto' }
                      }))}
                    >
                      <option value="light">{t('website_management.theme_light')}</option>
                      <option value="dark">{t('website_management.theme_dark')}</option>
                      <option value="auto">{t('website_management.theme_auto')}</option>
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
                  {t('website_management.platform_features')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(config.features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="capitalize font-medium">
                          {getFeatureLabel(feature, t)}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getFeatureDescription(feature, t)}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => updateFeatureToggle(feature as keyof WebsiteConfig['features'], checked)}
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
                  {t('website_management.live_preview')}
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
                    <h2 className="text-2xl font-bold mb-4">{t('website_management.welcome_to', { siteName: config.general.siteName })}</h2>
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
    </>
  )
}

function getFeatureLabel(feature: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    enableChat: t('website_management.feature_enable_chat_label'),
    enableNotifications: t('website_management.feature_enable_notifications_label'),
    enableComments: t('website_management.feature_enable_comments_label'),
    enableRatings: t('website_management.feature_enable_ratings_label'),
    enableSocialLogin: t('website_management.feature_enable_social_login_label'),
    maintenanceMode: t('website_management.feature_maintenance_mode_label'),
  }
  return labels[feature] || feature.replace(/([A-Z])/g, ' $1').trim()
}

function getFeatureDescription(feature: string, t: (key: string) => string): string {
  const descriptions: Record<string, string> = {
    enableChat: t('website_management.feature_enable_chat_desc'),
    enableNotifications: t('website_management.feature_enable_notifications_desc'),
    enableComments: t('website_management.feature_enable_comments_desc'),
    enableRatings: t('website_management.feature_enable_ratings_desc'),
    enableSocialLogin: t('website_management.feature_enable_social_login_desc'),
    maintenanceMode: t('website_management.feature_maintenance_mode_desc')
  }
  return descriptions[feature] || t('website_management.feature_toggle_default_desc')
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
