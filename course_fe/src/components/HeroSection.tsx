import { ImageWithFallback } from "./figma/ImageWithFallback"
import { Button } from "./ui/button"
import { useRouter } from "./Router"
import { useAuth } from "../contexts/AuthContext"
import { Search, TrendingUp, Users, Award } from "lucide-react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { getPublicStats, type PublicStats } from "../services/course.api"

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K+`
  return `${n}`
}

export function HeroSection() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { isAuthenticated } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    getPublicStats()
      .then(setStats)
      .catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate('/courses', undefined, { query: searchQuery.trim() })
    }
  }

  const popularSearches = ["Web Development", "Python", "React", "UI/UX Design", "Digital Marketing"]

  return (
    <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 py-16 md:py-24 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{t('hero.badge')}</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
              {t('hero.title')}
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t('hero.subtitle')}
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('hero.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </form>

            {/* Popular Searches */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('hero.popular')}</span>
              {popularSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => navigate('/courses', undefined, { query: search })}
                  className="text-sm px-3 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-700 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate(isAuthenticated ? '/courses' : '/signup')}
              >
                {isAuthenticated ? t('hero.explore_courses') : t('hero.join_free')}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary bg-white dark:bg-gray-800 font-semibold"
                onClick={() => navigate('/udemy-business')}
              >
                {t('hero.try_business')}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Users className="w-5 h-5" />
                  <span className="text-2xl font-bold">{stats ? formatLargeNumber(stats.total_students) : '...'}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('hero.active_students')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Award className="w-5 h-5" />
                  <span className="text-2xl font-bold">{stats ? formatLargeNumber(stats.total_courses) : '...'}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('hero.online_courses')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-2xl font-bold">{stats ? `${stats.avg_rating.toFixed(1)}★` : '...'}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('hero.average_rating')}</p>
              </div>
            </div>
          </div>
          
          {/* Right Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop"
                alt="Online learning community"
                className="w-full h-auto"
              />
              {/* Floating Card 1 */}
              <div className="absolute top-8 right-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-[200px]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t('hero.congratulations')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('hero.course_completed')}</p>
                  </div>
                </div>
              </div>
              
              {/* Floating Card 2 */}
              <div className="absolute bottom-8 left-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white" />
                    <div className="w-8 h-8 rounded-full bg-purple-400 border-2 border-white" />
                    <div className="w-8 h-8 rounded-full bg-pink-400 border-2 border-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t('hero.students_joined')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('hero.join_community')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}