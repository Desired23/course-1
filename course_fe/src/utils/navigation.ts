import i18n from './i18n'





export interface BreadcrumbItem {
  label: string
  href: string
}

export interface CategoryItem {
  id: string
  name: string
  slug: string
  color?: string
}




export function getQueryParams(url?: string): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const urlObj = url ? new URL(url, window.location.origin) : new URL(window.location.href)
  const params: Record<string, string> = {}

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}




export function buildUrl(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return path

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value)
  })

  return `${path}?${searchParams.toString()}`
}




export function generateCourseBreadcrumb(
  category?: string,
  subcategory?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: i18n.t('navigation.home'), href: '/' }
  ]

  if (category) {
    items.push({
      label: formatCategoryName(category),
      href: buildUrl('/courses', { category })
    })
  }

  if (subcategory && category) {
    items.push({
      label: formatCategoryName(subcategory),
      href: buildUrl('/courses', { category, subcategory })
    })
  }

  return items
}




export function formatCategoryName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}




export const COMMON_CATEGORIES: CategoryItem[] = [
  { id: '1', name: 'Development', slug: 'development' },
  { id: '2', name: 'Business', slug: 'business' },
  { id: '3', name: 'IT & Software', slug: 'it-software' },
  { id: '4', name: 'Design', slug: 'design' },
  { id: '5', name: 'Marketing', slug: 'marketing' },
  { id: '6', name: 'Personal Development', slug: 'personal-development' },
  { id: '7', name: 'Photography', slug: 'photography' },
  { id: '8', name: 'Music', slug: 'music' },
  { id: '9', name: 'Health & Fitness', slug: 'health-fitness' },
  { id: '10', name: 'Teaching & Academics', slug: 'teaching-academics' },
]




export const DEVELOPMENT_SUBCATEGORIES: CategoryItem[] = [
  { id: 'dev-1', name: 'Web Development', slug: 'web-development' },
  { id: 'dev-2', name: 'Mobile Development', slug: 'mobile-development' },
  { id: 'dev-3', name: 'Programming Languages', slug: 'programming-languages' },
  { id: 'dev-4', name: 'Game Development', slug: 'game-development' },
  { id: 'dev-5', name: 'Database Design', slug: 'database-design' },
  { id: 'dev-6', name: 'Software Testing', slug: 'software-testing' },
  { id: 'dev-7', name: 'Software Engineering', slug: 'software-engineering' },
  { id: 'dev-8', name: 'DevOps', slug: 'devops' },
]




export function getSubcategories(categorySlug: string): CategoryItem[] {
  switch (categorySlug) {
    case 'development':
      return DEVELOPMENT_SUBCATEGORIES

    default:
      return []
  }
}
