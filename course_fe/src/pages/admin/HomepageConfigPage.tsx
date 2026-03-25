import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Switch } from "../../components/ui/switch"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog"
import { GripVertical, Plus, Trash2, Eye, Settings, Image as ImageIcon, Save } from "lucide-react"
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"

export function HomepageConfigPage() {
  const defaultConfig = {
    hero: { title: '', subtitle: '', cta: '', ctaLink: '', backgroundImage: '' },
    sections: [] as { id: number; title: string; type: string; enabled: boolean; order: number }[],
    banners: [] as { id: number; title: string; description: string; image: string; cta: string; link: string; enabled: boolean }[]
  }
  const [config, setConfig] = useState(defaultConfig)
  const [configSettingId, setConfigSettingId] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)
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
    confirmLabel: 'Confirm',
    destructive: false,
    loading: false,
    action: null,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getSystemSettings()
        const setting = settings.find(s => s.key === 'homepage_config')
        if (setting) {
          setConfigSettingId(setting.id)
          try {
            const parsed = JSON.parse(setting.value)
            setConfig({ ...defaultConfig, ...parsed })
          } catch {}
        }
      } catch {}
    }
    load()
  }, [])

  // Hero Section
  const updateHero = (field: string, value: any) => {
    setConfig({
      ...config,
      hero: { ...config.hero, [field]: value }
    })
  }

  // Sections
  const toggleSection = (sectionId: number) => {
    setConfig({
      ...config,
      sections: config.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    })
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedItem === null) return
    
    const newSections = [...config.sections]
    const draggedSection = newSections[draggedItem]
    
    newSections.splice(draggedItem, 1)
    newSections.splice(dropIndex, 0, draggedSection)
    
    // Update order numbers
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      order: index + 1
    }))
    
    setConfig({ ...config, sections: reorderedSections })
    setDraggedItem(null)
    setIsDragging(false)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setIsDragging(false)
  }

  // Banners
  const addBanner = () => {
    const newBanner = {
      id: Date.now(),
      title: "New Banner",
      description: "Banner description",
      image: "https://images.unsplash.com/photo-1607969160688-e209f0ac9644?w=1200&h=300&fit=crop",
      cta: "Learn More",
      link: "/courses",
      enabled: true
    }
    setConfig({
      ...config,
      banners: [...config.banners, newBanner]
    })
  }

  const deleteBanner = (bannerId: number) => {
    setConfig({
      ...config,
      banners: config.banners.filter(b => b.id !== bannerId)
    })
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
        confirmLabel: 'Confirm',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  const updateBanner = (bannerId: number, field: string, value: any) => {
    setConfig({
      ...config,
      banners: config.banners.map(b => 
        b.id === bannerId ? { ...b, [field]: value } : b
      )
    })
  }

  const saveConfig = async () => {
    try {
      setIsSaving(true)
      const value = JSON.stringify(config)
      if (configSettingId) {
        await updateSystemSetting(configSettingId, { value })
      } else {
        const created = await createSystemSetting({ key: 'homepage_config', value })
        setConfigSettingId(created.id)
      }
      toast.success('Configuration saved successfully!')
    } catch {
      toast.error('Lưu thất bại')
    }
    setIsSaving(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Legacy page: cau hinh nay khong phai nguon public homepage chinh nua. Home hien dang doc tu `homepage_layout` va website settings.
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Homepage Configuration</h1>
          <p className="text-muted-foreground">Customize your homepage layout and content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button onClick={saveConfig} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Dang luu..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="sections">Page Sections</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="featured">Featured Content</TabsTrigger>
        </TabsList>

        {/* Hero Section Config */}
        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hero-enabled">Enable Hero Section</Label>
                <Switch
                  id="hero-enabled"
                  checked={config.hero.enabled}
                  onCheckedChange={(checked) => updateHero('enabled', checked)}
                />
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="hero-title">Title</Label>
                  <Input
                    id="hero-title"
                    value={config.hero.title}
                    onChange={(e) => updateHero('title', e.target.value)}
                    placeholder="Learn without limits"
                  />
                </div>

                <div>
                  <Label htmlFor="hero-subtitle">Subtitle</Label>
                  <Textarea
                    id="hero-subtitle"
                    value={config.hero.subtitle}
                    onChange={(e) => updateHero('subtitle', e.target.value)}
                    placeholder="Start, switch, or advance your career..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hero-cta-primary">Primary CTA</Label>
                    <Input
                      id="hero-cta-primary"
                      value={config.hero.cta_primary}
                      onChange={(e) => updateHero('cta_primary', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hero-cta-secondary">Secondary CTA</Label>
                    <Input
                      id="hero-cta-secondary"
                      value={config.hero.cta_secondary}
                      onChange={(e) => updateHero('cta_secondary', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="hero-bg">Background Image URL</Label>
                  <Input
                    id="hero-bg"
                    value={config.hero.background_image}
                    onChange={(e) => updateHero('background_image', e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hero-search"
                      checked={config.hero.show_search}
                      onCheckedChange={(checked) => updateHero('show_search', checked)}
                    />
                    <Label htmlFor="hero-search">Show Search Bar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hero-stats"
                      checked={config.hero.show_stats}
                      onCheckedChange={(checked) => updateHero('show_stats', checked)}
                    />
                    <Label htmlFor="hero-stats">Show Statistics</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections Config with Drag & Drop */}
        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Sections Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag and drop to reorder sections. Toggle switches to enable/disable.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {config.sections.map((section, index) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-4 bg-card border rounded-lg transition-all ${
                      isDragging && draggedItem === index
                        ? 'opacity-50 scale-95'
                        : 'hover:shadow-md cursor-move'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <Badge variant="outline">{section.order}</Badge>
                      <div>
                        <div className="font-medium">{section.component}</div>
                        <div className="text-sm text-muted-foreground">
                          Section ID: {section.id}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banners Config */}
        <TabsContent value="banners" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Promotional Banners</h3>
            <Button onClick={addBanner}>
              <Plus className="w-4 h-4 mr-2" />
              Add Banner
            </Button>
          </div>

          <div className="grid gap-4">
            {config.banners.map((banner) => (
              <Card key={banner.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Banner #{banner.id}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={banner.enabled}
                        onCheckedChange={(checked) => updateBanner(banner.id, 'enabled', checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openConfirm(
                          'Delete homepage banner',
                          `Delete banner "${banner.title}"?`,
                          'Delete banner',
                          () => deleteBanner(banner.id),
                          true,
                        )}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>CTA Text</Label>
                      <Input
                        value={banner.cta}
                        onChange={(e) => updateBanner(banner.id, 'cta', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={banner.description}
                      onChange={(e) => updateBanner(banner.id, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Image URL</Label>
                      <Input
                        value={banner.image}
                        onChange={(e) => updateBanner(banner.id, 'image', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Link URL</Label>
                      <Input
                        value={banner.link}
                        onChange={(e) => updateBanner(banner.id, 'link', e.target.value)}
                        placeholder="/courses"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="border rounded-lg overflow-hidden">
                    {banner.image ? (
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-muted text-muted-foreground">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="p-3 bg-muted">
                      <h4 className="font-semibold">{banner.title}</h4>
                      <p className="text-sm text-muted-foreground">{banner.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Featured Content */}
        <TabsContent value="featured" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Featured Content Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Featured Testimonials (IDs)</Label>
                <Input
                  value={config.featured_testimonials.join(', ')}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_testimonials: e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                  })}
                  placeholder="1, 2, 3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter comma-separated testimonial IDs
                </p>
              </div>

              <div>
                <Label>Popular Skills</Label>
                <Textarea
                  value={config.popular_skills.join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    popular_skills: e.target.value.split('\n').filter(s => s.trim())
                  })}
                  placeholder="Web Development&#10;Python&#10;Data Science"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  One skill per line
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Homepage Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Hero Preview */}
              {config.hero.enabled && (
                <div className="border rounded-lg p-6 bg-gradient-to-r from-primary/10 to-primary/5">
                  <h2 className="text-2xl font-bold mb-2">{config.hero.title}</h2>
                  <p className="text-muted-foreground mb-4">{config.hero.subtitle}</p>
                  <div className="flex gap-2">
                    <Button>{config.hero.cta_primary}</Button>
                    <Button variant="outline">{config.hero.cta_secondary}</Button>
                  </div>
                </div>
              )}

              {/* Sections Preview */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Active Sections (in order):</h3>
                <div className="space-y-2">
                  {config.sections
                    .filter(s => s.enabled)
                    .sort((a, b) => a.order - b.order)
                    .map(section => (
                      <div key={section.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Badge>{section.order}</Badge>
                        <span>{section.component}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Banners Preview */}
              {config.banners.filter(b => b.enabled).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <h3 className="font-semibold p-4 bg-muted">Active Banners:</h3>
                  {config.banners.filter(b => b.enabled).map(banner => (
                    <div key={banner.id} className="border-t">
                      {banner.image ? (
                        <img src={banner.image} alt={banner.title} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="flex h-24 items-center justify-center bg-muted text-muted-foreground">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="p-3">
                        <h4 className="font-medium">{banner.title}</h4>
                        <p className="text-sm text-muted-foreground">{banner.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </div>
  )
}
