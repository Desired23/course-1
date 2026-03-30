import { useEffect, useRef, useState } from "react"
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react"
import { BookOpen, Briefcase, Code, Database, Megaphone, Music, Palette } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getActiveCategories, getSubcategories, type Category } from "../services/category.api"
import { useRouter } from "./Router"

const CATEGORY_COLOR: Record<string, string> = {
  Development: 'bg-blue-100 text-blue-600',
  Business: 'bg-green-100 text-green-600',
  Design: 'bg-purple-100 text-purple-600',
  Marketing: 'bg-orange-100 text-orange-600',
  'IT & Software': 'bg-red-100 text-red-600',
  Music: 'bg-pink-100 text-pink-600',
}

interface CategoryWithSubs extends Category {
  icon: string
  color: string
  students: string
  subcategories: (Category & { description: string })[]
}

export function CategoryMegaMenu() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [categories, setCategories] = useState<CategoryWithSubs[]>([])
  const [loading, setLoading] = useState(true)
  const { navigate } = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getActiveCategories({ page_size: 100 })
        const topLevel = res.results.filter((category) => !category.parent_category)
        const withEmptySubs = topLevel.map((category) => ({
          ...category,
          icon: category.icon || 'BookOpen',
          color: CATEGORY_COLOR[category.name] || 'bg-gray-100 text-gray-600',
          students: '',
          subcategories: [],
        })) as CategoryWithSubs[]

        if (!cancelled) {
          setCategories(withEmptySubs)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeCategory) return

    const category = categories.find((entry) => entry.id === activeCategory)
    if (!category || category.subcategories.length > 0) return

    let cancelled = false
    ;(async () => {
      try {
        const subRes = await getSubcategories(activeCategory, { page_size: 100 })
        if (cancelled) return
        setCategories((prev) =>
          prev.map((entry) =>
            entry.id === activeCategory
              ? {
                  ...entry,
                  subcategories: subRes.results.map((subcategory) => ({
                    ...subcategory,
                    description: subcategory.description || '',
                  })),
                }
              : entry
          )
        )
      } catch {
        // Keep empty state when no subcategories are available.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeCategory, categories])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const iconMap: Record<string, any> = {
    Code,
    Briefcase,
    Palette,
    Megaphone,
    Database,
    Music,
    BookOpen,
  }

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => setIsOpen(true), 200)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      setActiveCategory(null)
    }, 300)
  }

  const handleCategoryClick = (categoryId: number) => {
    navigate('/courses', undefined, { category: String(categoryId) })
    setIsOpen(false)
    setActiveCategory(null)
  }

  const handleSubcategoryClick = (subcategoryId: number) => {
    navigate('/courses', undefined, { subcategory: String(subcategoryId) })
    setIsOpen(false)
    setActiveCategory(null)
  }

  const displayedCategories = categories.slice(0, 5)

  return (
    <div
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <button
        className="flex items-center gap-1 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium">{t('category_mega_menu.categories')}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 min-w-[800px]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex">
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
                <div className="p-2">
                  {displayedCategories.map((category) => {
                    const Icon = iconMap[category.icon] || BookOpen
                    const isActive = activeCategory === category.id

                    return (
                      <button
                        key={category.id}
                        onMouseEnter={() => setActiveCategory(category.id)}
                        onClick={() => handleCategoryClick(category.id)}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg transition-colors ${
                          isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="font-medium truncate">{category.name}</div>
                            {category.students && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {category.students}
                              </div>
                            )}
                          </div>
                        </div>
                        {category.subcategories.length > 0 && <ArrowRight className="w-4 h-4 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 p-4">
                {activeCategory ? (
                  <>
                    {(() => {
                      const category = categories.find((entry) => entry.id === activeCategory)
                      if (!category) return null

                      return (
                        <>
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-1">{category.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
                          </div>

                          {category.subcategories.length > 0 ? (
                            <>
                              <div className="mb-3">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  {t('category_mega_menu.popular_topics')}
                                </h4>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {category.subcategories.map((subcategory) => (
                                  <button
                                    key={subcategory.id}
                                    onClick={() => handleSubcategoryClick(subcategory.id)}
                                    className="text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                                  >
                                    <div className="font-medium text-sm group-hover:text-primary transition-colors">
                                      {subcategory.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                      {subcategory.description}
                                    </div>
                                  </button>
                                ))}
                              </div>

                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                  onClick={() => handleCategoryClick(category.id)}
                                  className="text-sm text-primary hover:underline font-medium"
                                >
                                  {t('category_mega_menu.view_all_courses', { categoryName: category.name })}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {t('category_mega_menu.no_subcategories')}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <div className="text-center">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{t('category_mega_menu.hover_to_explore')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={() => {
                navigate('/categories')
                setIsOpen(false)
                setActiveCategory(null)
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              {t('category_mega_menu.explore_all')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
