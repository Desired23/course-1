import { Tag } from 'lucide-react'
import { Badge } from './ui/badge'
import { useRouter } from './Router'
import { motion } from 'motion/react'

interface Category {
  id: string
  name: string
  slug: string
  color?: string
}

interface CourseCategoryTagsProps {
  categories: Category[]
  className?: string
  variant?: 'default' | 'compact'
  maxDisplay?: number
}

export function CourseCategoryTags({ 
  categories, 
  className = '', 
  variant = 'default',
  maxDisplay 
}: CourseCategoryTagsProps) {
  const { navigate } = useRouter()

  const handleCategoryClick = (slug: string) => {
    navigate(`/category/${slug}`)
  }

  if (categories.length === 0) return null

  const displayCategories = maxDisplay ? categories.slice(0, maxDisplay) : categories
  const remainingCount = maxDisplay && categories.length > maxDisplay 
    ? categories.length - maxDisplay 
    : 0

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {displayCategories.map((category, index) => (
          <span key={category.id} className="flex items-center">
            <button
              onClick={() => handleCategoryClick(category.slug)}
              className="text-sm text-purple-400 hover:text-purple-300 hover:underline transition-all duration-200"
            >
              {category.name}
            </button>
            {index < displayCategories.length - 1 && (
              <span className="text-gray-500 mx-1.5">•</span>
            )}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="text-sm text-gray-400">
            +{remainingCount} more
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 flex-shrink-0">
        <Tag className="w-4 h-4" />
        <span className="font-medium">Categories:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-purple-600 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => handleCategoryClick(category.slug)}
              style={category.color ? { backgroundColor: category.color } : undefined}
            >
              {category.name}
            </Badge>
          </motion.div>
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="cursor-default">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    </div>
  )
}
