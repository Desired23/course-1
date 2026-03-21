import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Switch } from '../../components/ui/switch'
import { Badge } from '../../components/ui/badge'
import { AdminHeader } from '../../components/AdminHeader'
import { toast } from 'sonner'
import { 
  Upload, Save, Settings, Image as ImageIcon, Globe, 
  Palette, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube,
  Linkedin, GripVertical, Eye, EyeOff
} from 'lucide-react'
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'
import { useTranslation } from 'react-i18next'

interface BannerConfig {
  id: string
  title: string
  description: string
  image: string
  cta: string
  link: string
  enabled: boolean
  order: number
}

interface SocialLinks {
  facebook?: string
  twitter?: string
  instagram?: string
  youtube?: string
  linkedin?: string
}

export function AdminWebsiteSettingsPage() {
  const { t } = useTranslation()
  const [settingsMap, setSettingsMap] = useState<Record<string, SystemSetting>>({})
  const [siteName, setSiteName] = useState('Udemy Clone')
  const [siteDescription, setSiteDescription] = useState('Learn anything, anytime, anywhere')
  const [siteLogo, setSiteLogo] = useState('/logo.png')
  const [favicon, setFavicon] = useState('/favicon.ico')
  const [primaryColor, setPrimaryColor] = useState('#A435F0')
  const [secondaryColor, setSecondaryColor] = useState('#5624D0')
  
  const [contactEmail, setContactEmail] = useState('support@udemy.com')
  const [contactPhone, setContactPhone] = useState('+84 123 456 789')
  const [contactAddress, setContactAddress] = useState('123 Learning Street, Education City')
  
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: 'https://facebook.com/udemy',
    twitter: 'https://twitter.com/udemy',
    instagram: 'https://instagram.com/udemy',
    youtube: 'https://youtube.com/udemy',
    linkedin: 'https://linkedin.com/company/udemy'
  })

  const [banners, setBanners] = useState<BannerConfig[]>([])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSystemSettings()
        const map: Record<string, SystemSetting> = {}
        settings.forEach(s => { map[s.key] = s })
        setSettingsMap(map)
        if (map['site_name']) setSiteName(map['site_name'].value)
        if (map['site_description']) setSiteDescription(map['site_description'].value)
        if (map['site_logo']) setSiteLogo(map['site_logo'].value)
        if (map['favicon']) setFavicon(map['favicon'].value)
        if (map['primary_color']) setPrimaryColor(map['primary_color'].value)
        if (map['secondary_color']) setSecondaryColor(map['secondary_color'].value)
        if (map['contact_email']) setContactEmail(map['contact_email'].value)
        if (map['contact_phone']) setContactPhone(map['contact_phone'].value)
        if (map['contact_address']) setContactAddress(map['contact_address'].value)
        if (map['social_links']) {
          try { setSocialLinks(JSON.parse(map['social_links'].value)) } catch {}
        }
        if (map['banners']) {
          try { setBanners(JSON.parse(map['banners'].value)) } catch {}
        }
      } catch {
        toast.error(t('admin_website_settings.load_failed'))
      }
    }
    loadSettings()
  }, [])

  const saveSetting = async (key: string, value: string) => {
    try {
      if (settingsMap[key]) {
        const updated = await updateSystemSetting(settingsMap[key].id, { value })
        setSettingsMap(prev => ({ ...prev, [key]: updated }))
      } else {
        const created = await createSystemSetting({ key, value })
        setSettingsMap(prev => ({ ...prev, [key]: created }))
      }
    } catch {
      throw new Error('Save failed')
    }
  }

  const handleSaveGeneral = async () => {
    try {
      await Promise.all([
        saveSetting('site_name', siteName),
        saveSetting('site_description', siteDescription)
      ])
      toast.success(t('admin_website_settings.general_saved'))
    } catch { toast.error(t('admin_website_settings.save_failed')) }
  }

  const handleSaveBranding = async () => {
    try {
      await Promise.all([
        saveSetting('site_logo', siteLogo),
        saveSetting('favicon', favicon),
        saveSetting('primary_color', primaryColor),
        saveSetting('secondary_color', secondaryColor)
      ])
      toast.success(t('admin_website_settings.branding_saved'))
    } catch { toast.error(t('admin_website_settings.save_failed')) }
  }

  const handleSaveContact = async () => {
    try {
      await Promise.all([
        saveSetting('contact_email', contactEmail),
        saveSetting('contact_phone', contactPhone),
        saveSetting('contact_address', contactAddress)
      ])
      toast.success(t('admin_website_settings.contact_saved'))
    } catch { toast.error(t('admin_website_settings.save_failed')) }
  }

  const handleSaveSocial = async () => {
    try {
      await saveSetting('social_links', JSON.stringify(socialLinks))
      toast.success(t('admin_website_settings.social_saved'))
    } catch { toast.error(t('admin_website_settings.save_failed')) }
  }

  const handleSaveBanners = async () => {
    try {
      await saveSetting('banners', JSON.stringify(banners))
      toast.success(t('admin_website_settings.banners_saved'))
    } catch { toast.error(t('admin_website_settings.save_failed')) }
  }

  const handleToggleBanner = (id: string) => {
    setBanners(banners.map(banner => 
      banner.id === id ? { ...banner, enabled: !banner.enabled } : banner
    ))
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', index.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'))
    const newBanners = [...banners]
    const draggedBanner = newBanners[dragIndex]
    
    newBanners.splice(dragIndex, 1)
    newBanners.splice(dropIndex, 0, draggedBanner)
    
    // Update order
    const reorderedBanners = newBanners.map((banner, index) => ({
      ...banner,
      order: index + 1
    }))
    
    setBanners(reorderedBanners)
    toast.success(t('admin_website_settings.banner_order_updated'))
  }

  return (
    <div className="p-6 space-y-6">
      <AdminHeader
        title={t('admin_website_settings.title')}
        subtitle={t('admin_website_settings.subtitle')}
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            {t('admin_website_settings.tabs.general')}
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-2" />
            {t('admin_website_settings.tabs.branding')}
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Phone className="w-4 h-4 mr-2" />
            {t('admin_website_settings.tabs.contact')}
          </TabsTrigger>
          <TabsTrigger value="social">
            <Globe className="w-4 h-4 mr-2" />
            {t('admin_website_settings.tabs.social')}
          </TabsTrigger>
          <TabsTrigger value="banners">
            <ImageIcon className="w-4 h-4 mr-2" />
            {t('admin_website_settings.tabs.banners')}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_website_settings.general.title')}</CardTitle>
              <CardDescription>{t('admin_website_settings.general.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">{t('admin_website_settings.general.site_name')}</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder={t('admin_website_settings.general.site_name_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">{t('admin_website_settings.general.site_description')}</Label>
                <Textarea
                  id="siteDescription"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder={t('admin_website_settings.general.site_description_placeholder')}
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveGeneral} className="gap-2">
                <Save className="w-4 h-4" />
                {t('admin_website_settings.general.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_website_settings.branding.title')}</CardTitle>
              <CardDescription>{t('admin_website_settings.branding.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteLogo">{t('admin_website_settings.branding.site_logo')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="siteLogo"
                        value={siteLogo}
                        onChange={(e) => setSiteLogo(e.target.value)}
                        placeholder={t('admin_website_settings.branding.logo_placeholder')}
                      />
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="w-4 h-4" />
                        {t('admin_website_settings.branding.upload_logo')}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('admin_website_settings.branding.logo_recommendation')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="favicon">{t('admin_website_settings.branding.favicon')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="favicon"
                        value={favicon}
                        onChange={(e) => setFavicon(e.target.value)}
                        placeholder={t('admin_website_settings.branding.favicon_placeholder')}
                      />
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="w-4 h-4" />
                        {t('admin_website_settings.branding.upload_favicon')}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('admin_website_settings.branding.favicon_recommendation')}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">{t('admin_website_settings.branding.primary_color')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#A435F0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">{t('admin_website_settings.branding.secondary_color')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#5624D0"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveBranding} className="gap-2">
                <Save className="w-4 h-4" />
                {t('admin_website_settings.branding.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_website_settings.contact.title')}</CardTitle>
              <CardDescription>{t('admin_website_settings.contact.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('admin_website_settings.contact.email')}
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t('admin_website_settings.contact.email_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t('admin_website_settings.contact.phone')}
                </Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder={t('admin_website_settings.contact.phone_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactAddress" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('admin_website_settings.contact.address')}
                </Label>
                <Textarea
                  id="contactAddress"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder={t('admin_website_settings.contact.address_placeholder')}
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveContact} className="gap-2">
                <Save className="w-4 h-4" />
                {t('admin_website_settings.contact.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_website_settings.social.title')}</CardTitle>
              <CardDescription>{t('admin_website_settings.social.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="w-4 h-4" />
                  {t('admin_website_settings.social.twitter')}
                </Label>
                <Input
                  id="twitter"
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube" className="flex items-center gap-2">
                  <Youtube className="w-4 h-4" />
                  YouTube
                </Label>
                <Input
                  id="youtube"
                  value={socialLinks.youtube}
                  onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                  placeholder="https://youtube.com/yourchannel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>

              <Button onClick={handleSaveSocial} className="gap-2">
                <Save className="w-4 h-4" />
                {t('admin_website_settings.social.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banners */}
        <TabsContent value="banners" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_website_settings.banners.title')}</CardTitle>
              <CardDescription>{t('admin_website_settings.banners.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors cursor-move"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Input
                            value={banner.title}
                            onChange={(e) => {
                              const newBanners = [...banners]
                              newBanners[index].title = e.target.value
                              setBanners(newBanners)
                            }}
                            placeholder={t('admin_website_settings.banners.banner_title_placeholder')}
                          />
                          <Badge variant={banner.enabled ? "default" : "secondary"}>
                            {t('admin_website_settings.banners.order_label', { order: banner.order })}
                          </Badge>
                        </div>
                        <Input
                          value={banner.description}
                          onChange={(e) => {
                            const newBanners = [...banners]
                            newBanners[index].description = e.target.value
                            setBanners(newBanners)
                          }}
                          placeholder={t('admin_website_settings.banners.banner_description_placeholder')}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={banner.cta}
                            onChange={(e) => {
                              const newBanners = [...banners]
                              newBanners[index].cta = e.target.value
                              setBanners(newBanners)
                            }}
                            placeholder={t('admin_website_settings.banners.button_text_placeholder')}
                          />
                          <Input
                            value={banner.link}
                            onChange={(e) => {
                              const newBanners = [...banners]
                              newBanners[index].link = e.target.value
                              setBanners(newBanners)
                            }}
                            placeholder={t('admin_website_settings.banners.button_link_placeholder')}
                          />
                        </div>
                        <Input
                          value={banner.image}
                          onChange={(e) => {
                            const newBanners = [...banners]
                            newBanners[index].image = e.target.value
                            setBanners(newBanners)
                          }}
                          placeholder={t('admin_website_settings.banners.image_placeholder')}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Switch
                        checked={banner.enabled}
                        onCheckedChange={() => handleToggleBanner(banner.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleBanner(banner.id)}
                      >
                        {banner.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const newBanner: BannerConfig = {
                      id: Date.now().toString(),
                      title: t('admin_website_settings.banners.new_banner_title'),
                      description: t('admin_website_settings.banners.new_banner_description'),
                      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=300&fit=crop',
                      cta: t('admin_website_settings.banners.learn_more'),
                      link: '/courses',
                      enabled: false,
                      order: banners.length + 1
                    }
                    setBanners([...banners, newBanner])
                  }}
                  className="gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  {t('admin_website_settings.banners.add_banner')}
                </Button>

                <Button onClick={handleSaveBanners} className="gap-2">
                  <Save className="w-4 h-4" />
                  {t('admin_website_settings.banners.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
