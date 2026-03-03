import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Switch } from '../../components/ui/switch'
import { Badge } from '../../components/ui/badge'
import { AdminHeader } from '../../components/AdminHeader'
import { toast } from 'sonner'
import { GripVertical, Eye, EyeOff, Plus, Save, RotateCcw } from 'lucide-react'
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

interface HomeSection {
  id: string
  component: string
  title: string
  description: string
  enabled: boolean
  order: number
  config?: Record<string, any>
}

const AVAILABLE_COMPONENTS = [
  {
    id: 'HeroSection',
    title: 'Hero Banner',
    description: 'Main hero section with CTA',
    category: 'header'
  },
  {
    id: 'FeaturedCourses',
    title: 'Featured Courses',
    description: 'Showcase featured courses',
    category: 'courses'
  },
  {
    id: 'TrendingCourses',
    title: 'Trending Courses',
    description: 'Display trending courses',
    category: 'courses'
  },
  {
    id: 'Categories',
    title: 'Categories Grid',
    description: 'Browse by category',
    category: 'navigation'
  },
  {
    id: 'PopularSkills',
    title: 'Popular Skills',
    description: 'Most in-demand skills',
    category: 'content'
  },
  {
    id: 'TestimonialsSection',
    title: 'Student Testimonials',
    description: 'Reviews from students',
    category: 'social-proof'
  },
  {
    id: 'StatsSection',
    title: 'Statistics',
    description: 'Platform statistics showcase',
    category: 'social-proof'
  },
  {
    id: 'InstructorPromo',
    title: 'Become an Instructor',
    description: 'CTA for potential instructors',
    category: 'marketing'
  },
  {
    id: 'LearningGoals',
    title: 'Learning Goals',
    description: 'Why learn with us',
    category: 'content'
  },
  {
    id: 'FeaturesSection',
    title: 'Platform Features',
    description: 'Key platform features',
    category: 'content'
  },
  {
    id: 'NewsletterSection',
    title: 'Newsletter Signup',
    description: 'Email subscription form',
    category: 'marketing'
  },
  {
    id: 'PartnersSection',
    title: 'Partners & Clients',
    description: 'Trusted by companies',
    category: 'social-proof'
  },
  {
    id: 'BlogPosts',
    title: 'Latest Blog Posts',
    description: 'Recent articles',
    category: 'content'
  },
  {
    id: 'FAQSection',
    title: 'FAQ',
    description: 'Frequently asked questions',
    category: 'support'
  }
]

export function AdminHomeLayoutPage() {
  const [layoutSettingId, setLayoutSettingId] = useState<number | null>(null)
  const [sections, setSections] = useState<HomeSection[]>([
    { id: '1', component: 'HeroSection', title: 'Hero Banner', description: 'Main hero section with CTA', enabled: true, order: 1 },
    { id: '2', component: 'FeaturesSection', title: 'Platform Features', description: 'Key platform features', enabled: true, order: 2 },
    { id: '3', component: 'Categories', title: 'Categories Grid', description: 'Browse by category', enabled: true, order: 3 },
    { id: '4', component: 'FeaturedCourses', title: 'Featured Courses', description: 'Showcase featured courses', enabled: true, order: 4 },
    { id: '5', component: 'LearningGoals', title: 'Learning Goals', description: 'Why learn with us', enabled: true, order: 5 },
    { id: '6', component: 'TrendingCourses', title: 'Trending Courses', description: 'Display trending courses', enabled: true, order: 6 },
    { id: '7', component: 'PopularSkills', title: 'Popular Skills', description: 'Most in-demand skills', enabled: true, order: 7 },
    { id: '8', component: 'TestimonialsSection', title: 'Student Testimonials', description: 'Reviews from students', enabled: true, order: 8 },
    { id: '9', component: 'StatsSection', title: 'Statistics', description: 'Platform statistics showcase', enabled: true, order: 9 },
    { id: '10', component: 'InstructorPromo', title: 'Become an Instructor', description: 'CTA for potential instructors', enabled: true, order: 10 },
    { id: '11', component: 'NewsletterSection', title: 'Newsletter Signup', description: 'Email subscription form', enabled: true, order: 11 }
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getSystemSettings()
        const layoutSetting = settings.find(s => s.key === 'homepage_layout')
        if (layoutSetting) {
          setLayoutSettingId(layoutSetting.id)
          try {
            const parsed = JSON.parse(layoutSetting.value)
            if (Array.isArray(parsed) && parsed.length > 0) setSections(parsed)
          } catch {}
        }
      } catch {}
    }
    load()
  }, [])

  const [showAddSection, setShowAddSection] = useState(false)

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
    const newSections = [...sections]
    const draggedSection = newSections[dragIndex]
    
    newSections.splice(dragIndex, 1)
    newSections.splice(dropIndex, 0, draggedSection)
    
    // Update order
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      order: index + 1
    }))
    
    setSections(reorderedSections)
    toast.success('Section order updated!')
  }

  const handleToggleSection = (id: string) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, enabled: !section.enabled } : section
    ))
  }

  const handleRemoveSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id))
    toast.success('Section removed!')
  }

  const handleAddSection = (componentId: string) => {
    const component = AVAILABLE_COMPONENTS.find(c => c.id === componentId)
    if (!component) return

    // Check if component already exists
    if (sections.find(s => s.component === componentId)) {
      toast.error('This component is already added!')
      return
    }

    const newSection: HomeSection = {
      id: Date.now().toString(),
      component: componentId,
      title: component.title,
      description: component.description,
      enabled: true,
      order: sections.length + 1
    }

    setSections([...sections, newSection])
    setShowAddSection(false)
    toast.success(`${component.title} added!`)
  }

  const handleSave = async () => {
    try {
      const value = JSON.stringify(sections)
      if (layoutSettingId) {
        await updateSystemSetting(layoutSettingId, { value })
      } else {
        const created = await createSystemSetting({ key: 'homepage_layout', value })
        setLayoutSettingId(created.id)
      }
      toast.success('Homepage layout saved successfully!')
    } catch {
      toast.error('Lưu thất bại')
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default layout?')) {
      // Reset to default
      setSections([
        { id: '1', component: 'HeroSection', title: 'Hero Banner', description: 'Main hero section with CTA', enabled: true, order: 1 },
        { id: '2', component: 'FeaturesSection', title: 'Platform Features', description: 'Key platform features', enabled: true, order: 2 },
        { id: '3', component: 'Categories', title: 'Categories Grid', description: 'Browse by category', enabled: true, order: 3 },
        { id: '4', component: 'FeaturedCourses', title: 'Featured Courses', description: 'Showcase featured courses', enabled: true, order: 4 }
      ])
      toast.success('Layout reset to default!')
    }
  }

  const groupedComponents = AVAILABLE_COMPONENTS.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = []
    }
    acc[component.category].push(component)
    return acc
  }, {} as Record<string, typeof AVAILABLE_COMPONENTS>)

  return (
    <div className="p-6 space-y-6">
      <AdminHeader
        title="Homepage Layout"
        subtitle="Customize your homepage by enabling, disabling, and reordering sections"
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setShowAddSection(!showAddSection)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Section
        </Button>
        <Button onClick={handleSave} variant="default" className="gap-2">
          <Save className="w-4 h-4" />
          Save Layout
        </Button>
        <Button onClick={handleReset} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Default
        </Button>
      </div>

      {/* Add Section Panel */}
      {showAddSection && (
        <Card>
          <CardHeader>
            <CardTitle>Available Components</CardTitle>
            <CardDescription>
              Click on a component to add it to your homepage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(groupedComponents).map(([category, components]) => (
              <div key={category} className="mb-6">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">
                  {category.replace('-', ' ')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {components.map((component) => {
                    const isAdded = sections.find(s => s.component === component.id)
                    return (
                      <Button
                        key={component.id}
                        variant={isAdded ? "secondary" : "outline"}
                        className="h-auto p-4 flex flex-col items-start gap-2"
                        onClick={() => !isAdded && handleAddSection(component.id)}
                        disabled={!!isAdded}
                      >
                        <div className="font-medium text-left">{component.title}</div>
                        <div className="text-xs text-muted-foreground text-left">
                          {component.description}
                        </div>
                        {isAdded && <Badge variant="secondary" className="text-xs">Added</Badge>}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Layout */}
      <Card>
        <CardHeader>
          <CardTitle>Current Homepage Layout</CardTitle>
          <CardDescription>
            Drag sections to reorder. Toggle to enable/disable. Click X to remove.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sections added yet. Click "Add Section" to get started.</p>
            </div>
          ) : (
            sections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`border rounded-lg p-4 transition-all ${
                  section.enabled 
                    ? 'bg-card hover:bg-accent/50' 
                    : 'bg-muted/50 opacity-60'
                } cursor-move`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{section.title}</h4>
                        <Badge variant={section.enabled ? "default" : "secondary"}>
                          Order: {section.order}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        Component: <code className="bg-muted px-1 py-0.5 rounded">{section.component}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${section.id}`} className="text-sm text-muted-foreground">
                        {section.enabled ? 'Visible' : 'Hidden'}
                      </Label>
                      <Switch
                        id={`toggle-${section.id}`}
                        checked={section.enabled}
                        onCheckedChange={() => handleToggleSection(section.id)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleSection(section.id)}
                    >
                      {section.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSection(section.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview Info */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{sections.length}</div>
              <div className="text-sm text-muted-foreground">Total Sections</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {sections.filter(s => s.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Enabled</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">
                {sections.filter(s => !s.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Hidden</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
