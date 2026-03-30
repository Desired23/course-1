import { useState, useEffect } from "react"
import { Code, Briefcase, Palette, Megaphone, Database, Music, ChevronRight, BookOpen, Target, TrendingUp, Loader2 } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { useRouter } from "../../components/Router"
import { getActiveCategories, buildCategoryTree, type CategoryTreeNode } from "../../services/category.api"
import { useTranslation } from "react-i18next"

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
  
  // Icon mapping
  const iconMap: Record<string, any> = {
    Code,
    Briefcase,
    Palette,
    Megaphone,
    Database,
    Music
  }

  // Pick an icon based on category name (simple heuristic)
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

  // Pick a color class based on index
  const colorClasses = [
    'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
  ]
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('categories_page.hero.title')}
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
            {t('categories_page.hero.description')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">{t('categories_page.hero.stats.courses')}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Target className="w-5 h-5" />
              <span className="font-semibold">{t('categories_page.hero.stats.categories')}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">{t('categories_page.hero.stats.students')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Categories Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-4">{t('categories_page.popular.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('categories_page.popular.description')}
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
              <Card 
                key={category.id} 
                className="cursor-pointer hover:shadow-lg transition-all group overflow-hidden"
                onClick={() => navigate('/courses', undefined, { category: String(category.id) })}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {category.description || t('categories_page.category_fallback_description', { name: category.name.toLowerCase() })}
                      </p>
                      
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        {subcategoryCount > 0 && (
                          <span>{t('categories_page.subcategories_count', { count: subcategoryCount })}</span>
                        )}
                      </div>
                      
                      {/* Subcategories Preview */}
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
            )
          })}
        </div>
        )}

        {/* Category Benefits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">{t('categories_page.benefits.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('categories_page.benefits.diverse_topics.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('categories_page.benefits.diverse_topics.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('categories_page.benefits.skill_levels.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('categories_page.benefits.skill_levels.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('categories_page.benefits.industry_skills.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('categories_page.benefits.industry_skills.description')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-4">{t('categories_page.cta.title')}</h2>
          <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
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
        </div>
      </div>
    </div>
  )
}
