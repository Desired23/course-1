









import { http } from './http'



export interface Category {
  id: number
  name: string
  description: string | null
  icon: string | null
  parent_category: number | null
  status: 'active' | 'inactive'
  course_count?: number
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export type PaginatedCategories = PaginatedResponse<Category>



export interface CategoryListParams {
  page?: number
  page_size?: number
}








let __activeCategoriesCache: Promise<PaginatedCategories> | null = null
let __activeCategoriesCacheTime = 0

export async function getActiveCategories(
  params?: CategoryListParams
): Promise<PaginatedCategories> {
  const now = Date.now()

  if (__activeCategoriesCache && now - __activeCategoriesCacheTime < 60000) {
    return __activeCategoriesCache
  }
  const promise = http.get<PaginatedCategories>('/categories/active', {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 100,
  })
  __activeCategoriesCache = promise
  __activeCategoriesCacheTime = now
  return promise
}

export function clearCategoryCache(): void {
  __activeCategoriesCache = null
  __activeCategoriesCacheTime = 0
}





export async function getTopCategories(limit = 6): Promise<Category[]> {
  return http.get<Category[]>('/categories/top', { limit })
}





export async function getSubcategories(
  categoryId: number,
  params?: CategoryListParams
): Promise<PaginatedCategories> {
  return http.get<PaginatedCategories>(`/categories/${categoryId}/subcategories`, {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 100,
  })
}





export async function getAllCategories(
  params?: CategoryListParams
): Promise<PaginatedCategories> {
  return http.get<PaginatedCategories>('/categories/', params)
}





export async function getCategoryById(categoryId: number): Promise<Category> {
  return http.get<Category>(`/categories/${categoryId}`)
}





export async function createCategory(data: {
  name: string
  description?: string
  icon?: string | null
  parent_category?: number | null
  status?: string
}): Promise<Category> {
  return http.post<Category>('/categories/create', data)
}





export async function updateCategory(
  categoryId: number,
  data: Partial<{ name: string; description: string; icon: string | null; parent_category: number | null; status: string }>
): Promise<Category> {
  return http.patch<Category>(`/categories/${categoryId}/update`, data)
}





export async function deleteCategory(categoryId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/categories/${categoryId}/delete`)
}



export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}





export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []


  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }


  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parent_category && map.has(cat.parent_category)) {
      map.get(cat.parent_category)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
