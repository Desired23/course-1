import { useEffect, useState, type DragEvent } from "react"
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Switch } from "../../components/ui/switch"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog"
import { GripVertical, Plus, Trash2, Eye, Image as ImageIcon, Save } from "lucide-react"
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog"

type HomepageSection = {
  id: number
  component: string
  enabled: boolean
  order: number
}

type HomepageBanner = {
  id: number
  title: string
  description: string
  image: string
  cta: string
  link: string
  enabled: boolean
}

type HomepageConfig = {
  hero: {
    enabled: boolean
    title: string
    subtitle: string
    cta_primary: string
    cta_secondary: string
    background_image: string
    show_search: boolean
    show_stats: boolean
  }
  sections: HomepageSection[]
  banners: HomepageBanner[]
  featured_testimonials: number[]
  popular_skills: string[]
}

const DEFAULT_CONFIG: HomepageConfig = {
  hero: {
    enabled: true,
    title: '',
    subtitle: '',
    cta_primary: '',
    cta_secondary: '',
    background_image: '',
    show_search: true,
    show_stats: true,
  },
  sections: [],
  banners: [],
  featured_testimonials: [],
  popular_skills: [],
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

export function HomepageConfigPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'hero' | 'sections' | 'banners' | 'featured'>('hero')
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_CONFIG)
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
    confirmLabel: '',
    destructive: false,
    loading: false,
    action: null,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getSystemSettings()
        const setting = settings.find(s => s.key === 'homepage_config')

        if (!setting) return

        setConfigSettingId(setting.id)

        try {
          const parsed = JSON.parse(setting.value)
          setConfig({
            hero: { ...DEFAULT_CONFIG.hero, ...(parsed?.hero ?? {}) },
            sections: Array.isArray(parsed?.sections) ? parsed.sections : DEFAULT_CONFIG.sections,
            banners: Array.isArray(parsed?.banners) ? parsed.banners : DEFAULT_CONFIG.banners,
            featured_testimonials: Array.isArray(parsed?.featured_testimonials) ? parsed.featured_testimonials : DEFAULT_CONFIG.featured_testimonials,
            popular_skills: Array.isArray(parsed?.popular_skills) ? parsed.popular_skills : DEFAULT_CONFIG.popular_skills,
          })
        } catch {
          setConfig(DEFAULT_CONFIG)
        }
      } catch {

      }
    }

    void load()
  }, [])

  const updateHero = (field: keyof HomepageConfig['hero'], value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      hero: { ...prev.hero, [field]: value },
    }))
  }

  const toggleSection = (sectionId: number) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section
      ),
    }))
  }

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedItem(index)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedItem === null) return

    const newSections = [...config.sections]
    const draggedSection = newSections[draggedItem]

    newSections.splice(draggedItem, 1)
    newSections.splice(dropIndex, 0, draggedSection)

    setConfig(prev => ({
      ...prev,
      sections: newSections.map((section, index) => ({
        ...section,
        order: index + 1,
      })),
    }))
    setDraggedItem(null)
    setIsDragging(false)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setIsDragging(false)
  }

  const addBanner = () => {
    const newBanner: HomepageBanner = {
      id: Date.now(),
      title: t('homepage_config.banners.new_banner_title'),
      description: t('homepage_config.banners.new_banner_description'),
      image: "https://images.unsplash.com/photo-1607969160688-e209f0ac9644?w=1200&h=300&fit=crop",
      cta: t('homepage_config.banners.new_banner_cta'),
      link: "/courses",
      enabled: true,
    }

    setConfig(prev => ({
      ...prev,
      banners: [...prev.banners, newBanner],
    }))
  }

  const deleteBanner = (bannerId: number) => {
    setConfig(prev => ({
      ...prev,
      banners: prev.banners.filter(banner => banner.id !== bannerId),
    }))
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
      setConfirmState(prev => ({ ...prev, loading: true }))
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
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const updateBanner = (bannerId: number, field: keyof HomepageBanner, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      banners: prev.banners.map(banner =>
        banner.id === bannerId ? { ...banner, [field]: value } : banner
      ),
    }))
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

      toast.success(t('homepage_config.toasts.save_success'))
    } catch {
      toast.error(t('homepage_config.toasts.save_failed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      className="container mx-auto max-w-7xl p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" variants={fadeInUp}>
        {t('homepage_config.legacy_notice')}
      </motion.div>

      <motion.div className="mb-6 flex items-center justify-between" variants={fadeInUp}>
        <div>
          <h1 className="mb-2 text-3xl font-bold">{t('homepage_config.title')}</h1>
          <p className="text-muted-foreground">{t('homepage_config.subtitle')}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? t('homepage_config.hide_preview') : t('homepage_config.show_preview')}
          </Button>

          <Button onClick={saveConfig} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? t('homepage_config.saving') : t('homepage_config.save_changes')}
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'hero' | 'sections' | 'banners' | 'featured')} className="space-y-6">
        <TabsList className="relative grid w-full grid-cols-4 p-1">
          <TabsTrigger value="hero" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'hero' && <motion.span layoutId="homepage-config-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('homepage_config.tabs.hero')}</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'sections' && <motion.span layoutId="homepage-config-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('homepage_config.tabs.sections')}</span>
          </TabsTrigger>
          <TabsTrigger value="banners" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'banners' && <motion.span layoutId="homepage-config-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('homepage_config.tabs.banners')}</span>
          </TabsTrigger>
          <TabsTrigger value="featured" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'featured' && <motion.span layoutId="homepage-config-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('homepage_config.tabs.featured')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('homepage_config.hero.settings_title')}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hero-enabled">{t('homepage_config.hero.enable')}</Label>
                <Switch
                  id="hero-enabled"
                  checked={config.hero.enabled}
                  onCheckedChange={(checked) => updateHero('enabled', checked)}
                />
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="hero-title">{t('homepage_config.hero.title_label')}</Label>
                  <Input
                    id="hero-title"
                    value={config.hero.title}
                    onChange={(e) => updateHero('title', e.target.value)}
                    placeholder={t('homepage_config.hero.title_placeholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="hero-subtitle">{t('homepage_config.hero.subtitle_label')}</Label>
                  <Textarea
                    id="hero-subtitle"
                    value={config.hero.subtitle}
                    onChange={(e) => updateHero('subtitle', e.target.value)}
                    placeholder={t('homepage_config.hero.subtitle_placeholder')}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hero-cta-primary">{t('homepage_config.hero.primary_cta')}</Label>
                    <Input
                      id="hero-cta-primary"
                      value={config.hero.cta_primary}
                      onChange={(e) => updateHero('cta_primary', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="hero-cta-secondary">{t('homepage_config.hero.secondary_cta')}</Label>
                    <Input
                      id="hero-cta-secondary"
                      value={config.hero.cta_secondary}
                      onChange={(e) => updateHero('cta_secondary', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="hero-bg">{t('homepage_config.hero.background_image')}</Label>
                  <Input
                    id="hero-bg"
                    value={config.hero.background_image}
                    onChange={(e) => updateHero('background_image', e.target.value)}
                    placeholder={t('homepage_config.hero.background_image_placeholder')}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hero-search"
                      checked={config.hero.show_search}
                      onCheckedChange={(checked) => updateHero('show_search', checked)}
                    />
                    <Label htmlFor="hero-search">{t('homepage_config.hero.show_search')}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hero-stats"
                      checked={config.hero.show_stats}
                      onCheckedChange={(checked) => updateHero('show_stats', checked)}
                    />
                    <Label htmlFor="hero-stats">{t('homepage_config.hero.show_statistics')}</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('homepage_config.sections.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('homepage_config.sections.description')}
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
                    className={`flex items-center justify-between rounded-lg border bg-card p-4 transition-all ${
                      isDragging && draggedItem === index
                        ? 'scale-95 opacity-50'
                        : 'cursor-move hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <Badge variant="outline">{section.order}</Badge>
                      <div>
                        <div className="font-medium">{section.component}</div>
                        <div className="text-sm text-muted-foreground">
                          {t('homepage_config.sections.section_id', { id: section.id })}
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

        <TabsContent value="banners" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('homepage_config.banners.title')}</h3>
            <Button onClick={addBanner}>
              <Plus className="mr-2 h-4 w-4" />
              {t('homepage_config.banners.add')}
            </Button>
          </div>

          <div className="grid gap-4">
            {config.banners.map((banner) => (
              <Card key={banner.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t('homepage_config.banners.banner_title', { id: banner.id })}
                    </CardTitle>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={banner.enabled}
                        onCheckedChange={(checked) => updateBanner(banner.id, 'enabled', checked)}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openConfirm(
                          t('homepage_config.banners.delete_title'),
                          t('homepage_config.banners.delete_description', { title: banner.title }),
                          t('homepage_config.banners.delete_confirm'),
                          () => deleteBanner(banner.id),
                          true,
                        )}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('homepage_config.banners.title_label')}</Label>
                      <Input
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>{t('homepage_config.banners.cta_text')}</Label>
                      <Input
                        value={banner.cta}
                        onChange={(e) => updateBanner(banner.id, 'cta', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>{t('homepage_config.banners.description_label')}</Label>
                    <Textarea
                      value={banner.description}
                      onChange={(e) => updateBanner(banner.id, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('homepage_config.banners.image_url')}</Label>
                      <Input
                        value={banner.image}
                        onChange={(e) => updateBanner(banner.id, 'image', e.target.value)}
                        placeholder={t('homepage_config.banners.image_url_placeholder')}
                      />
                    </div>

                    <div>
                      <Label>{t('homepage_config.banners.link_url')}</Label>
                      <Input
                        value={banner.link}
                        onChange={(e) => updateBanner(banner.id, 'link', e.target.value)}
                        placeholder={t('homepage_config.banners.link_url_placeholder')}
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border">
                    {banner.image ? (
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="h-32 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-muted text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}

                    <div className="bg-muted p-3">
                      <h4 className="font-semibold">{banner.title}</h4>
                      <p className="text-sm text-muted-foreground">{banner.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="featured" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('homepage_config.featured.title')}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label>{t('homepage_config.featured.testimonials_label')}</Label>
                <Input
                  value={config.featured_testimonials.join(', ')}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    featured_testimonials: e.target.value
                      .split(',')
                      .map(id => parseInt(id.trim(), 10))
                      .filter(id => !Number.isNaN(id)),
                  }))}
                  placeholder={t('homepage_config.featured.testimonials_placeholder')}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('homepage_config.featured.testimonials_hint')}
                </p>
              </div>

              <div>
                <Label>{t('homepage_config.featured.skills_label')}</Label>
                <Textarea
                  value={config.popular_skills.join('\n')}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    popular_skills: e.target.value.split('\n').filter(skill => skill.trim()),
                  }))}
                  placeholder={t('homepage_config.featured.skills_placeholder')}
                  rows={6}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('homepage_config.featured.skills_hint')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>

      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('homepage_config.preview.title')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {config.hero.enabled && (
                <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                  <h2 className="mb-2 text-2xl font-bold">{config.hero.title}</h2>
                  <p className="mb-4 text-muted-foreground">{config.hero.subtitle}</p>
                  <div className="flex gap-2">
                    <Button>{config.hero.cta_primary}</Button>
                    <Button variant="outline">{config.hero.cta_secondary}</Button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold">{t('homepage_config.preview.active_sections')}</h3>
                <div className="space-y-2">
                  {config.sections
                    .filter(section => section.enabled)
                    .sort((a, b) => a.order - b.order)
                    .map(section => (
                      <div key={section.id} className="flex items-center gap-2 rounded bg-muted p-2">
                        <Badge>{section.order}</Badge>
                        <span>{section.component}</span>
                      </div>
                    ))}
                </div>
              </div>

              {config.banners.filter(banner => banner.enabled).length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                  <h3 className="bg-muted p-4 font-semibold">{t('homepage_config.preview.active_banners')}</h3>
                  {config.banners.filter(banner => banner.enabled).map(banner => (
                    <div key={banner.id} className="border-t">
                      {banner.image ? (
                        <img src={banner.image} alt={banner.title} className="h-24 w-full object-cover" />
                      ) : (
                        <div className="flex h-24 items-center justify-center bg-muted text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
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
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
      </motion.div>
    </motion.div>
  )
}
