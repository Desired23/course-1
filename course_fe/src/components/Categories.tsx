import { Code, Briefcase, Palette, Megaphone, Database, Music, BookOpen, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { useRouter } from "./Router"
import { getActiveCategories, type Category } from "../services/category.api"
import { useState, useEffect } from "react"

// Default icon/color mapping by category name
const CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  Development: { icon: 'Code', color: 'bg-blue-100 text-blue-600' },
  Business: { icon: 'Briefcase', color: 'bg-green-100 text-green-600' },
  Design: { icon: 'Palette', color: 'bg-purple-100 text-purple-600' },
  Marketing: { icon: 'Megaphone', color: 'bg-orange-100 text-orange-600' },
  'IT & Software': { icon: 'Database', color: 'bg-red-100 text-red-600' },
  Music: { icon: 'Music', color: 'bg-pink-100 text-pink-600' },
}

export function Categories() {
  const { navigate } = useRouter()
  const [categories, setCategories] = useState<(Category & { icon: string; color: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getActiveCategories({ page_size: 20 })
      .then(res => {
        if (!cancelled) {
          const topLevel = res.results
            .filter(c => !c.parent_category)
            .map(c => {
              const style = CATEGORY_STYLE[c.name] || { icon: 'BookOpen', color: 'bg-gray-100 text-gray-600' }
              return { ...c, icon: style.icon, color: style.color }
            })
          setCategories(topLevel)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
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
  
  return (
    <section className="py-16 px-4 bg-white dark:bg-gray-950">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Top categories</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose from thousands of courses created by expert instructors
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || BookOpen
            return (
              <Card 
                key={category.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/courses', undefined, { category: String(category.id) })}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                </CardContent>
              </Card>
            )
          })}
        </div>
        )}

        <div className="text-center mt-8">
          <Button 
            variant="outline"
            onClick={() => navigate('/categories')}
          >
            Explore all categories
          </Button>
        </div>
      </div>
    </section>
  )
}