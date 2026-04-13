import { useState, useEffect } from "react"
import { Code, Briefcase, Palette, Megaphone, Database, Music, ChevronRight, BookOpen, Target, TrendingUp } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Skeleton } from "../../components/ui/skeleton"
import { motion } from 'motion/react'
import { useRouter } from "../../components/Router"
import { getActiveCategories, buildCategoryTree, type CategoryTreeNode } from "../../services/category.api"
import { useTranslation } from "react-i18next"
import { listItemTransition } from '../../lib/motion'

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
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function CategoriesPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await getActiveCategories({ page: 1, page_size: 200 })
        if (cancelled) return
        const tree = buildCategoryTree(res.results)
        setCategoryTree(tree)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Không thể tải danh mục')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])


  const iconMap: Record<string, any> = {
    Code,
    Briefcase,
    Palette,
    Megaphone,
    Database,
    Music
  }


  const pickIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('develop') || lower.includes('programming') || lower.includes('lập trình')) return Code
    if (lower.includes('business') || lower.includes('kinh doanh')) return Briefcase
    if (lower.includes('design') || lower.includes('thiết kế')) return Palette
    if (lower.includes('marketing') || lower.includes('tiếp thị')) return Megaphone
    if (lower.includes('data') || lower.includes('dữ liệu')) return Database
    if (lower.includes('music') || lower.includes('âm nhạc')) return Music
    return BookOpen
  }


  const colorClasses = [
    'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
  ]

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >

      <div className="bg-gradient-to-br from-blue-600 to-purple-700 px-4 py-12 text-white sm:py-16">
        <motion.div className="container mx-auto text-center" variants={fadeInUp} initial="hidden" animate="show">
          <motion.h1 className="mb-4 text-3xl font-bold md:text-5xl" variants={fadeInUp}>
            {t('categories_page.hero.title')}
          </motion.h1>
          <motion.p className="mx-auto mb-8 max-w-3xl text-base text-blue-100 sm:text-xl" variants={fadeInUp}>
            {t('categories_page.hero.description')}
          </motion.p>
          <motion.div className="flex flex-wrap justify-center gap-3 sm:gap-4" variants={fadeInUp}>
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-xs backdrop-blur-sm sm:px-4 sm:text-sm">
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">{t('categories_page.hero.stats.courses')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-xs backdrop-blur-sm sm:px-4 sm:text-sm">
              <Target className="w-5 h-5" />
              <span className="font-semibold">{t('categories_page.hero.stats.categories')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-xs backdrop-blur-sm sm:px-4 sm:text-sm">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">{t('categories_page.hero.stats.students')}</span>
            </div>
          </motion.div>
        </motion.div>
      </div>


      <motion.div className="container mx-auto px-4 py-8 sm:py-12" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="mb-12" variants={fadeInUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{t('categories_page.popular.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('categories_page.popular.description')}
          </p>
        </motion.div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`category-skeleton-${index}`} className="rounded-lg border bg-card p-4 space-y-4 sm:p-6">
                <Skeleton className="h-14 w-14 rounded-lg" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Thử lại</Button>
          </div>
        )}

        {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {categoryTree.map((category, idx) => {
            const Icon = pickIcon(category.name)
            const colorClass = colorClasses[idx % colorClasses.length]
            const subcategoryCount = category.children?.length || 0

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={listItemTransition(idx)}
              >
              <Card
                className="app-interactive cursor-pointer hover:shadow-lg group overflow-hidden"
                onClick={() => navigate('/courses', undefined, { category: String(category.id) })}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-lg font-bold transition-colors group-hover:text-primary sm:text-xl">
                          {category.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-primary" />
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {category.description || t('categories_page.category_fallback_description', { name: category.name.toLowerCase() })}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        {subcategoryCount > 0 && (
                          <span>{t('categories_page.subcategories_count', { count: subcategoryCount })}</span>
                        )}
                      </div>


                      {category.children && category.children.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {category.children.slice(0, 3).map((sub) => (
                            <Badge
                              key={sub.id}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-primary hover:text-white transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate('/courses', undefined, { subcategory: String(sub.id) })
                              }}
                            >
                              {sub.name}
                            </Badge>
                          ))}
                          {category.children.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              {t('categories_page.more_count', { count: category.children.length - 3 })}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )
          })}
        </div>
        )}


        <motion.div className="app-surface-elevated mb-12 rounded-lg p-6 sm:p-8" variants={fadeInUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl">{t('categories_page.benefits.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div className="text-center" variants={fadeInUp}>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('categories_page.benefits.diverse_topics.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('categories_page.benefits.diverse_topics.description')}
              </p>
            </motion.div>

            <motion.div className="text-center" variants={fadeInUp}>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('categories_page.benefits.skill_levels.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('categories_page.benefits.skill_levels.description')}
              </p>
            </motion.div>

            <motion.div className="text-center" variants={fadeInUp}>
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('categories_page.benefits.industry_skills.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('categories_page.benefits.industry_skills.description')}
              </p>
            </motion.div>
          </div>
        </motion.div>


        <motion.div className="rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-center text-white sm:p-12" variants={fadeInUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{t('categories_page.cta.title')}</h2>
          <p className="mx-auto mb-6 max-w-2xl text-base text-blue-100 sm:text-xl">
            {t('categories_page.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="hover:bg-gray-100 dark:hover:bg-gray-200"
              style={{ backgroundColor: '#ffffff', color: '#2563eb' }}
              onClick={() => navigate('/courses')}
            >
              {t('categories_page.cta.browse_courses')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="hover:bg-white/10"
              style={{ backgroundColor: 'transparent', color: '#ffffff', borderColor: '#ffffff' }}
              onClick={() => navigate('/signup')}
            >
              {t('categories_page.cta.signup_free')}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
