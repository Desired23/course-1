import { useState } from 'react'
import { Search, TrendingUp, Code, Database, Palette, Megaphone, Users, Camera, Music, Heart, BookOpen, ChevronRight } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useRouter } from '../../components/Router'
import { useTranslation } from 'react-i18next'

interface Topic {
  id: string
  name: string
  slug: string
  category: string
  icon: any
  courseCount: number
  studentCount: string
  trending?: boolean
  descriptionKey: string
}

const allTopics: Topic[] = [
  // Development
  {
    id: '1',
    name: 'React',
    slug: 'react',
    category: 'development',
    icon: Code,
    courseCount: 450,
    studentCount: '2.5M+',
    trending: true,
    descriptionKey: 'react'
  },
  {
    id: '2',
    name: 'Python',
    slug: 'python',
    category: 'development',
    icon: Code,
    courseCount: 820,
    studentCount: '4.2M+',
    trending: true,
    descriptionKey: 'python'
  },
  {
    id: '3',
    name: 'JavaScript',
    slug: 'javascript',
    category: 'development',
    icon: Code,
    courseCount: 680,
    studentCount: '3.8M+',
    trending: true,
    descriptionKey: 'javascript'
  },
  {
    id: '4',
    name: 'Node.js',
    slug: 'nodejs',
    category: 'development',
    icon: Code,
    courseCount: 320,
    studentCount: '1.8M+',
    trending: false,
    descriptionKey: 'nodejs'
  },
  {
    id: '5',
    name: 'TypeScript',
    slug: 'typescript',
    category: 'development',
    icon: Code,
    courseCount: 180,
    studentCount: '950K+',
    trending: true,
    descriptionKey: 'typescript'
  },
  {
    id: '6',
    name: 'Java',
    slug: 'java',
    category: 'development',
    icon: Code,
    courseCount: 450,
    studentCount: '2.1M+',
    trending: false,
    descriptionKey: 'java'
  },
  {
    id: '7',
    name: 'C#',
    slug: 'csharp',
    category: 'development',
    icon: Code,
    courseCount: 280,
    studentCount: '1.2M+',
    trending: false,
    descriptionKey: 'csharp'
  },
  {
    id: '8',
    name: 'PHP',
    slug: 'php',
    category: 'development',
    icon: Code,
    courseCount: 340,
    studentCount: '1.5M+',
    trending: false,
    descriptionKey: 'php'
  },
  
  // Data Science & AI
  {
    id: '9',
    name: 'Machine Learning',
    slug: 'machine-learning',
    category: 'data-science',
    icon: Database,
    courseCount: 420,
    studentCount: '2.8M+',
    trending: true,
    descriptionKey: 'machine_learning'
  },
  {
    id: '10',
    name: 'Deep Learning',
    slug: 'deep-learning',
    category: 'data-science',
    icon: Database,
    courseCount: 250,
    studentCount: '1.4M+',
    trending: true,
    descriptionKey: 'deep_learning'
  },
  {
    id: '11',
    name: 'Data Analysis',
    slug: 'data-analysis',
    category: 'data-science',
    icon: Database,
    courseCount: 380,
    studentCount: '2.1M+',
    trending: false,
    descriptionKey: 'data_analysis'
  },
  {
    id: '12',
    name: 'SQL',
    slug: 'sql',
    category: 'data-science',
    icon: Database,
    courseCount: 290,
    studentCount: '1.6M+',
    trending: false,
    descriptionKey: 'sql'
  },
  
  // Design
  {
    id: '13',
    name: 'UI/UX Design',
    slug: 'ui-ux-design',
    category: 'design',
    icon: Palette,
    courseCount: 320,
    studentCount: '1.8M+',
    trending: true,
    descriptionKey: 'ui_ux_design'
  },
  {
    id: '14',
    name: 'Graphic Design',
    slug: 'graphic-design',
    category: 'design',
    icon: Palette,
    courseCount: 450,
    studentCount: '2.2M+',
    trending: false,
    descriptionKey: 'graphic_design'
  },
  {
    id: '15',
    name: 'Figma',
    slug: 'figma',
    category: 'design',
    icon: Palette,
    courseCount: 180,
    studentCount: '890K+',
    trending: true,
    descriptionKey: 'figma'
  },
  {
    id: '16',
    name: 'Adobe Photoshop',
    slug: 'photoshop',
    category: 'design',
    icon: Palette,
    courseCount: 520,
    studentCount: '2.5M+',
    trending: false,
    descriptionKey: 'photoshop'
  },
  
  // Marketing
  {
    id: '17',
    name: 'Digital Marketing',
    slug: 'digital-marketing',
    category: 'marketing',
    icon: Megaphone,
    courseCount: 380,
    studentCount: '2.0M+',
    trending: true,
    descriptionKey: 'digital_marketing'
  },
  {
    id: '18',
    name: 'SEO',
    slug: 'seo',
    category: 'marketing',
    icon: Megaphone,
    courseCount: 240,
    studentCount: '1.3M+',
    trending: false,
    descriptionKey: 'seo'
  },
  {
    id: '19',
    name: 'Social Media Marketing',
    slug: 'social-media-marketing',
    category: 'marketing',
    icon: Megaphone,
    courseCount: 290,
    studentCount: '1.6M+',
    trending: true,
    descriptionKey: 'social_media_marketing'
  },
  {
    id: '20',
    name: 'Content Marketing',
    slug: 'content-marketing',
    category: 'marketing',
    icon: Megaphone,
    courseCount: 180,
    studentCount: '950K+',
    trending: false,
    descriptionKey: 'content_marketing'
  }
]

const categories = [
  { id: 'all', icon: BookOpen },
  { id: 'development', icon: Code },
  { id: 'data-science', icon: Database },
  { id: 'design', icon: Palette },
  { id: 'marketing', icon: Megaphone }
]

export default function AllTopicsPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Filter topics
  const filteredTopics = allTopics.filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory
    return matchesSearch && matchesCategory
  })
  
  // Separate trending topics
  const trendingTopics = filteredTopics.filter(t => t.trending)
  const otherTopics = filteredTopics.filter(t => !t.trending)
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl mb-3 md:mb-4">{t('all_topics_page.title')}</h1>
          <p className="text-sm md:text-lg text-gray-200 mb-4 md:mb-6 max-w-2xl">
            {t('all_topics_page.hero_description')}
          </p>
          
          {/* Search */}
          <div className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <Input
                type="text"
                placeholder={t('all_topics_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 md:pl-12 h-12 md:h-14 text-base md:text-lg bg-white text-gray-900 border-0"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6 md:mb-8">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map(category => {
              const Icon = category.icon
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="gap-1 md:gap-2 text-xs md:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <Icon className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="whitespace-nowrap">{t(`all_topics_page.categories.${category.id}`)}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        
        {/* Results Count */}
        <div className="mb-4 md:mb-6">
          <p className="text-sm md:text-base text-muted-foreground">
            {t('all_topics_page.showing_topics', { count: filteredTopics.length })}
          </p>
        </div>
        
        {/* Trending Topics */}
        {trendingTopics.length > 0 && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              <h2 className="text-xl md:text-2xl font-semibold">{t('all_topics_page.trending_title')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {trendingTopics.map(topic => {
                const Icon = topic.icon
                return (
                  <Card
                    key={topic.id}
                    className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-purple-400"
                    onClick={() => navigate(`/topic/${topic.slug}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-white" />
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                          {t('all_topics_page.trending_badge')}
                        </Badge>
                      </div>
                      <CardTitle className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {topic.name}
                      </CardTitle>
                      <CardDescription>{t(`all_topics_page.descriptions.${topic.descriptionKey}`)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t('all_topics_page.course_count', { count: topic.courseCount })}</span>
                        <span>{t('all_topics_page.student_count', { count: topic.studentCount })}</span>
                      </div>
                      <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                        <span className="text-sm">{t('all_topics_page.explore')}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        
        {/* All Topics */}
        {otherTopics.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">
              {trendingTopics.length > 0 ? t('all_topics_page.more_topics') : t('all_topics_page.all_topics')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {otherTopics.map(topic => {
                const Icon = topic.icon
                return (
                  <Card
                    key={topic.id}
                    className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-purple-400"
                    onClick={() => navigate(`/topic/${topic.slug}`)}
                  >
                    <CardHeader>
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-purple-600 transition-colors mb-3 w-fit">
                        <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-white" />
                      </div>
                      <CardTitle className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {topic.name}
                      </CardTitle>
                      <CardDescription>{t(`all_topics_page.descriptions.${topic.descriptionKey}`)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t('all_topics_page.course_count', { count: topic.courseCount })}</span>
                        <span>{t('all_topics_page.student_count', { count: topic.studentCount })}</span>
                      </div>
                      <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                        <span className="text-sm">{t('all_topics_page.explore')}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        
        {/* No Results */}
        {filteredTopics.length === 0 && (
          <Card className="p-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('all_topics_page.empty.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('all_topics_page.empty.description')}
            </p>
            <Button onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}>
              {t('all_topics_page.empty.clear_filters')}
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
