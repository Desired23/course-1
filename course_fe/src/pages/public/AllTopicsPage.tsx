import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Search, TrendingUp, Code, Database, Palette, Megaphone, BookOpen, ChevronRight } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useRouter } from '../../components/Router'
import { useTranslation } from 'react-i18next'
import { getActiveCategories, type Category } from '../../services/category.api'
import { getErrorMessage } from '../../lib/apiError'

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

function getCategoryIcon(iconStr: string | null, name: string) {
  const text = (iconStr || name).toLowerCase()
  if (/code|dev|program|web|software|react|javascript|node|java|php|python/.test(text)) return Code
  if (/data|database|sql|science|analyt|machine|deep|learn/.test(text)) return Database
  if (/design|art|ui|ux|figma|photo|graphic|visual/.test(text)) return Palette
  if (/market|seo|social|advertis|content|digital/.test(text)) return Megaphone
  return BookOpen
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function AllTopicsPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActiveCategories({ page_size: 200 })
      .then(res => setAllCategories(res.results))
      .catch((e) => toast.error(getErrorMessage(e, 'Không thể tải danh mục.')))
      .finally(() => setLoading(false))
  }, [])

  // Parent categories (top-level) are used as filter tabs
  const parentCategories = allCategories.filter(c => c.parent_category === null)

  // Topics: prefer subcategories; fall back to all categories if structure is flat
  const hasSubcategories = allCategories.some(c => c.parent_category !== null)
  const topicCategories = hasSubcategories
    ? allCategories.filter(c => c.parent_category !== null)
    : allCategories

  // Mark top 30% by course_count as trending
  const sorted = [...topicCategories].sort((a, b) => (b.course_count ?? 0) - (a.course_count ?? 0))
  const trendingCutoff = Math.max(1, Math.ceil(sorted.length * 0.3))
  const trendingIds = new Set(sorted.slice(0, trendingCutoff).map(c => c.id))

  const filteredTopics = topicCategories.filter(cat => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || String(cat.parent_category) === selectedCategory
    return matchesSearch && matchesCategory
  })

  const trendingTopics = filteredTopics.filter(c => trendingIds.has(c.id))
  const otherTopics = filteredTopics.filter(c => !trendingIds.has(c.id))

  const tabList = [
    { id: 'all', name: t('all_topics_page.categories.all'), icon: BookOpen },
    ...parentCategories.map(p => ({
      id: String(p.id),
      name: p.name,
      icon: getCategoryIcon(p.icon, p.name),
    })),
  ]

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="bg-gradient-to-r from-purple-900 to-purple-700 text-white" variants={fadeInUp} initial="hidden" animate="show">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl mb-3 md:mb-4">{t('all_topics_page.title')}</h1>
          <p className="text-sm md:text-lg text-gray-200 mb-4 md:mb-6 max-w-2xl">
            {t('all_topics_page.hero_description')}
          </p>
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
      </motion.div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <motion.div variants={sectionStagger} initial="hidden" animate="show">
          <motion.div variants={fadeInUp}>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6 md:mb-8">
              <TabsList className="h-auto w-full flex-nowrap justify-start gap-2 overflow-x-auto bg-transparent p-1">
                {tabList.map(tab => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={`relative shrink-0 whitespace-nowrap gap-1 text-xs md:gap-2 md:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none ${selectedCategory === tab.id ? 'text-white' : ''}`}
                    >
                      {selectedCategory === tab.id && (
                        <motion.span
                          layoutId="all-topics-tabs-glider"
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 rounded-md bg-purple-600 shadow-sm"
                        />
                      )}
                      <Icon className="relative z-10 w-3 h-3 md:w-4 md:h-4" />
                      <span className="relative z-10 whitespace-nowrap">{tab.name}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </motion.div>

          <motion.div className="mb-4 md:mb-6" variants={fadeInUp}>
            <p className="text-sm md:text-base text-muted-foreground">
              {loading
                ? t('all_topics_page.loading', 'Loading...')
                : t('all_topics_page.showing_topics', { count: filteredTopics.length })}
            </p>
          </motion.div>

          {!loading && trendingTopics.length > 0 && (
            <motion.div className="mb-8 md:mb-12" variants={fadeInUp}>
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                <h2 className="text-xl md:text-2xl font-semibold">{t('all_topics_page.trending_title')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {trendingTopics.map((cat, index) => {
                  const Icon = getCategoryIcon(cat.icon, cat.name)
                  return (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: index * 0.03, ease: 'easeOut' }}
                      whileHover={{ y: -2 }}
                    >
                      <Card
                        className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-purple-400"
                        onClick={() => navigate(`/topic/${slugify(cat.name)}`)}
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
                            {cat.name}
                          </CardTitle>
                          {cat.description && <CardDescription>{cat.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                            <span>{t('all_topics_page.course_count', { count: cat.course_count ?? 0 })}</span>
                          </div>
                          <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                            <span className="text-sm">{t('all_topics_page.explore')}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {!loading && otherTopics.length > 0 && (
            <motion.div variants={fadeInUp}>
              <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">
                {trendingTopics.length > 0 ? t('all_topics_page.more_topics') : t('all_topics_page.all_topics')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {otherTopics.map((cat, index) => {
                  const Icon = getCategoryIcon(cat.icon, cat.name)
                  return (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: index * 0.02, ease: 'easeOut' }}
                      whileHover={{ y: -2 }}
                    >
                      <Card
                        className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-purple-400"
                        onClick={() => navigate(`/topic/${slugify(cat.name)}`)}
                      >
                        <CardHeader>
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-purple-600 transition-colors mb-3 w-fit">
                            <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-white" />
                          </div>
                          <CardTitle className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {cat.name}
                          </CardTitle>
                          {cat.description && <CardDescription>{cat.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                            <span>{t('all_topics_page.course_count', { count: cat.course_count ?? 0 })}</span>
                          </div>
                          <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                            <span className="text-sm">{t('all_topics_page.explore')}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {!loading && filteredTopics.length === 0 && (
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center sm:p-12">
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
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
