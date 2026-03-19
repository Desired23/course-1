/**
 * Category API Service
 * 
 * BE endpoints:
 *   GET /api/categories/active          — public, paginated list of active categories
 *   GET /api/categories/{id}            — admin/instructor only, detail
 *   GET /api/categories/{id}/subcategories — public, paginated subcategories
 *   GET /api/categories/               — admin/instructor only, all categories
 */

import { http } from './http'

// ─── Types ──────────────────────────────────────────────────

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

// ─── Query params ───────────────────────────────────────────

export interface CategoryListParams {
  page?: number
  page_size?: number
}

// ─── API functions ──────────────────────────────────────────

/**
 * Get active categories (public, no auth required)
 * GET /api/categories/active?page=1&page_size=100
 */
// simple in-memory cache for active categories
let __activeCategoriesCache: Promise<PaginatedCategories> | null = null
let __activeCategoriesCacheTime = 0

export async function getActiveCategories(
  params?: CategoryListParams
): Promise<PaginatedCategories> {
  const now = Date.now()
  // reuse cache for 1 minute regardless of params
  if (__activeCategoriesCache && now - __activeCategoriesCacheTime < 60000) {
    return __activeCategoriesCache
  }
  const promise = http.get<PaginatedCategories>('/categories/active', {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 100,  // get all categories by default
  })
  __activeCategoriesCache = promise
  __activeCategoriesCacheTime = now
  return promise
}

export function clearCategoryCache(): void {
  __activeCategoriesCache = null
  __activeCategoriesCacheTime = 0
}

/**
 * Get top categories by published course count (public)
 * GET /api/categories/top?limit=6
 */
export async function getTopCategories(limit = 6): Promise<Category[]> {
  return http.get<Category[]>('/categories/top', { limit })
}

/**
 * Get subcategories of a parent category (public)
 * GET /api/categories/{categoryId}/subcategories
 */
export async function getSubcategories(
  categoryId: number,
  params?: CategoryListParams
): Promise<PaginatedCategories> {
  return http.get<PaginatedCategories>(`/categories/${categoryId}/subcategories`, {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 100,
  })
}

/**
 * Get all categories (admin/instructor, requires auth)
 * GET /api/categories/
 */
export async function getAllCategories(
  params?: CategoryListParams
): Promise<PaginatedCategories> {
  return http.get<PaginatedCategories>('/categories/', params)
}

/**
 * Get category detail by ID (admin/instructor, requires auth)
 * GET /api/categories/{categoryId}
 */
export async function getCategoryById(categoryId: number): Promise<Category> {
  return http.get<Category>(`/categories/${categoryId}`)
}

/**
 * Create a new category (admin only)
 * POST /api/categories/create
 */
export async function createCategory(data: {
  name: string
  description?: string
  icon?: string | null
  parent_category?: number | null
  status?: string
}): Promise<Category> {
  return http.post<Category>('/categories/create', data)
}

/**
 * Update a category (admin only)
 * PATCH /api/categories/{categoryId}/update
 */
export async function updateCategory(
  categoryId: number,
  data: Partial<{ name: string; description: string; icon: string | null; parent_category: number | null; status: string }>
): Promise<Category> {
  return http.patch<Category>(`/categories/${categoryId}/update`, data)
}

/**
 * Delete a category (admin only)
 * DELETE /api/categories/{categoryId}/delete
 */
export async function deleteCategory(categoryId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/categories/${categoryId}/delete`)
}

// ─── Helper: build category tree from flat list ─────────────

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

/**
 * Build a tree structure from a flat list of categories.
 * Root categories have parent_category === null.
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []

  // Create tree nodes
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  // Link children to parents
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
