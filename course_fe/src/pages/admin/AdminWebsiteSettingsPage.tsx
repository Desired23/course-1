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
        toast.error('Không thể tải cài đặt hệ thống')
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
      toast.success('General settings saved successfully!')
    } catch { toast.error('Lưu thất bại') }
  }

  const handleSaveBranding = async () => {
    try {
      await Promise.all([
        saveSetting('site_logo', siteLogo),
        saveSetting('favicon', favicon),
        saveSetting('primary_color', primaryColor),
        saveSetting('secondary_color', secondaryColor)
      ])
      toast.success('Branding settings saved successfully!')
    } catch { toast.error('Lưu thất bại') }
  }

  const handleSaveContact = async () => {
    try {
      await Promise.all([
        saveSetting('contact_email', contactEmail),
        saveSetting('contact_phone', contactPhone),
        saveSetting('contact_address', contactAddress)
      ])
      toast.success('Contact information saved successfully!')
    } catch { toast.error('Lưu thất bại') }
  }

  const handleSaveSocial = async () => {
    try {
      await saveSetting('social_links', JSON.stringify(socialLinks))
      toast.success('Social links saved successfully!')
    } catch { toast.error('Lưu thất bại') }
  }

  const handleSaveBanners = async () => {
    try {
      await saveSetting('banners', JSON.stringify(banners))
      toast.success('Banners saved successfully!')
    } catch { toast.error('Lưu thất bại') }
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
    toast.success('Banner order updated!')
  }

  return (
    <div className="p-6 space-y-6">
      <AdminHeader
        title="Website Settings"
        subtitle="Manage your website configuration, branding, and content"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Phone className="w-4 h-4 mr-2" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="social">
            <Globe className="w-4 h-4 mr-2" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="banners">
            <ImageIcon className="w-4 h-4 mr-2" />
            Banners
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>
                Basic information about your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Enter site name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="Enter site description"
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveGeneral} className="gap-2">
                <Save className="w-4 h-4" />
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Customize your brand logo and colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteLogo">Site Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="siteLogo"
                        value={siteLogo}
                        onChange={(e) => setSiteLogo(e.target.value)}
                        placeholder="Logo URL"
                      />
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommended: 256x256px, PNG format
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="favicon">Favicon</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="favicon"
                        value={favicon}
                        onChange={(e) => setFavicon(e.target.value)}
                        placeholder="Favicon URL"
                      />
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Favicon
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommended: 32x32px, ICO or PNG format
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
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
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
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
                Save Branding Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                How users can reach you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="support@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+84 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactAddress" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </Label>
                <Textarea
                  id="contactAddress"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Enter your business address"
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveContact} className="gap-2">
                <Save className="w-4 h-4" />
                Save Contact Information
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Connect your social media accounts
              </CardDescription>
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
                  Twitter / X
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
                Save Social Links
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banners */}
        <TabsContent value="banners" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Banners</CardTitle>
              <CardDescription>
                Manage promotional banners on your homepage. Drag to reorder.
              </CardDescription>
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
                            placeholder="Banner title"
                          />
                          <Badge variant={banner.enabled ? "default" : "secondary"}>
                            Order: {banner.order}
                          </Badge>
                        </div>
                        <Input
                          value={banner.description}
                          onChange={(e) => {
                            const newBanners = [...banners]
                            newBanners[index].description = e.target.value
                            setBanners(newBanners)
                          }}
                          placeholder="Banner description"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={banner.cta}
                            onChange={(e) => {
                              const newBanners = [...banners]
                              newBanners[index].cta = e.target.value
                              setBanners(newBanners)
                            }}
                            placeholder="Button text"
                          />
                          <Input
                            value={banner.link}
                            onChange={(e) => {
                              const newBanners = [...banners]
                              newBanners[index].link = e.target.value
                              setBanners(newBanners)
                            }}
                            placeholder="Button link"
                          />
                        </div>
                        <Input
                          value={banner.image}
                          onChange={(e) => {
                            const newBanners = [...banners]
                            newBanners[index].image = e.target.value
                            setBanners(newBanners)
                          }}
                          placeholder="Image URL"
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
                      title: 'New Banner',
                      description: 'Banner description',
                      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=300&fit=crop',
                      cta: 'Learn More',
                      link: '/courses',
                      enabled: false,
                      order: banners.length + 1
                    }
                    setBanners([...banners, newBanner])
                  }}
                  className="gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Add Banner
                </Button>

                <Button onClick={handleSaveBanners} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Banners
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
