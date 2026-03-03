import { useState, useEffect, useRef } from "react"
import { ChevronDown, ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "./Router"
import { getActiveCategories, getSubcategories, type Category } from "../services/category.api"
import { Code, Briefcase, Palette, Megaphone, Database, Music, BookOpen } from "lucide-react"

// Default icon/color mapping by category name (fallback when BE has no icon field)
const CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  Development: { icon: 'Code', color: 'bg-blue-100 text-blue-600' },
  Business: { icon: 'Briefcase', color: 'bg-green-100 text-green-600' },
  Design: { icon: 'Palette', color: 'bg-purple-100 text-purple-600' },
  Marketing: { icon: 'Megaphone', color: 'bg-orange-100 text-orange-600' },
  'IT & Software': { icon: 'Database', color: 'bg-red-100 text-red-600' },
  Music: { icon: 'Music', color: 'bg-pink-100 text-pink-600' },
}

interface CategoryWithSubs extends Category {
  icon: string
  color: string
  students: string
  subcategories: (Category & { description: string })[]
}

export function CategoryMegaMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [categories, setCategories] = useState<CategoryWithSubs[]>([])
  const [loading, setLoading] = useState(true)
  const { navigate } = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  // Fetch categories + subcategories from API
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await getActiveCategories({ page_size: 100 })
        // Only top-level categories (no parent)
        const topLevel = res.results.filter(c => !c.parent_category)
        // Fetch subcategories for each
        const withSubs = await Promise.all(
          topLevel.map(async (cat) => {
            let subs: Category[] = []
            try {
              const subRes = await getSubcategories(cat.id, { page_size: 100 })
              subs = subRes.results
            } catch { /* no subs */ }
            const style = CATEGORY_STYLE[cat.name] || { icon: 'BookOpen', color: 'bg-gray-100 text-gray-600' }
            return {
              ...cat,
              icon: style.icon,
              color: style.color,
              students: '',
              subcategories: subs.map(s => ({ ...s, description: s.description || '' })),
            } as CategoryWithSubs
          })
        )
        if (!cancelled) {
          setCategories(withSubs)
          setLoading(false)
        }
      } catch {
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
    Music,
    BookOpen
  }

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, 200)
  }

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      setActiveCategory(null)
    }, 300)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const handleCategoryClick = (categoryId: number, _categoryName: string) => {
    navigate('/courses', undefined, { category: String(categoryId) })
    setIsOpen(false)
    setActiveCategory(null)
  }

  const handleSubcategoryClick = (subcategoryId: number, _subcategoryName: string) => {
    navigate('/courses', undefined, { subcategory: String(subcategoryId) })
    setIsOpen(false)
    setActiveCategory(null)
  }

  return (
    <div
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {/* Trigger Button */}
      <button
        className="flex items-center gap-1 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium">Categories</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Mega Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 min-w-[800px]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
          <div className="flex">
            {/* Left Column - Main Categories */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
              <div className="p-2">
                {categories.map((category) => {
                  const Icon = iconMap[category.icon] || BookOpen
                  const isActive = activeCategory === category.id
                  
                  return (
                    <button
                      key={category.id}
                      onMouseEnter={() => setActiveCategory(category.id)}
                      onClick={() => handleCategoryClick(category.id, category.name)}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
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
                      {category.subcategories && category.subcategories.length > 0 && (
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Column - Subcategories */}
            <div className="flex-1 p-4">
              {activeCategory ? (
                <>
                  {(() => {
                    const category = categories.find(c => c.id === activeCategory)
                    if (!category) return null

                    return (
                      <>
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold mb-1">{category.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {category.description}
                          </p>
                        </div>

                        {category.subcategories && category.subcategories.length > 0 ? (
                          <>
                            <div className="mb-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Popular Topics
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {category.subcategories.map((subcategory) => (
                                <button
                                  key={subcategory.id}
                                  onClick={() => handleSubcategoryClick(subcategory.id, subcategory.name)}
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

                            {/* View All Link */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => handleCategoryClick(category.id, category.name)}
                                className="text-sm text-primary hover:underline font-medium"
                              >
                                View all {category.name} courses →
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            No subcategories available
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
                    <p className="text-sm">Hover over a category to see topics</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={() => {
                navigate('/categories')
                setIsOpen(false)
                setActiveCategory(null)
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              Explore all categories →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
