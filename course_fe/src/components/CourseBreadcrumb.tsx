import { ChevronRight, Home } from 'lucide-react'
import { useRouter } from './Router'

interface BreadcrumbItem {
  label: string
  href: string
}

interface CourseBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  showHomeIcon?: boolean
}

export function CourseBreadcrumb({ 
  items, 
  className = '', 
  showHomeIcon = true 
}: CourseBreadcrumbProps) {
  const { navigate } = useRouter()

  return (
    <nav 
      className={`flex items-center gap-2 text-sm flex-wrap ${className}`} 
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isFirst = index === 0
        const isLast = index === items.length - 1
        
        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            
            <button
              onClick={() => navigate(item.href)}
              className={`
                transition-colors cursor-pointer flex items-center gap-1.5
                ${isLast 
                  ? 'text-gray-300 font-medium' 
                  : 'text-gray-400 hover:text-purple-400'
                }
              `}
              aria-current={isLast ? 'page' : undefined}
            >
              {isFirst && showHomeIcon && <Home className="w-4 h-4" />}
              <span className="truncate max-w-[150px] sm:max-w-none">{item.label}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
