/**
 * Blog Posts API Service
 *
 * BE endpoints (all under /api/):
 *   GET    /client/blog-posts/                              — list published posts (paginated)
 *   GET    /client/blog-posts/?blog_post_id=X              — single published post
 *   PATCH  /client/blog-posts/increase-views/<id>/         — increment views
 *   GET    /admin/blog-posts/                               — list all posts (admin/instructor)
 *   GET    /admin/blog-posts/?blog_post_id=X               — single post
 *   POST   /admin/blog-posts/create/                        — create
 *   PATCH  /admin/blog-posts/update/<id>/                   — update
 *   DELETE /admin/blog-posts/delete/<id>/                   — delete
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id: number
  title: string
  content: string
  author: number | null         // user FK id
  author_name: string | null
  author_avatar: string | null
  created_at: string
  updated_at: string
  status: 'draft' | 'published' | 'archived'
  tags: string[] | null
  category: number | null       // category FK id
  category_name: string | null
  slug: string
  featured_image: string | null
  summary: string | null
  published_at: string | null
  views: number
  likes: number
  allow_comments: boolean
  is_featured: boolean
  comments_count: number
}

export interface BlogComment {
  id: number
  blog_post: number
  content: string
  user: number
  user_name: string | null
  user_avatar: string | null
  created_at: string
  updated_at: string
  parent: number | null
  likes: number
  status: 'active' | 'deleted'
  replies_count: number
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

export interface BlogPostCreateData {
  title: string
  content: string
  status?: string
  tags?: string[]
  category?: number | null
  slug?: string
  featured_image?: string
  summary?: string
  is_featured?: boolean
}

// ─── Client (public) endpoints ────────────────────────────────────────────────

/** Get paginated list of published blog posts. */
export async function getPublishedBlogPosts(
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<BlogPost>> {
  const query: Record<string, string | number> = {}
  if (params?.page) query.page = params.page
  if (params?.page_size) query.page_size = params.page_size
  return http.get<PaginatedResponse<BlogPost>>('/client/blog-posts/', query)
}

/** Get all published blog posts (auto-paginate). */
export async function getAllPublishedBlogPosts(): Promise<BlogPost[]> {
  const all: BlogPost[] = []
  let page = 1
  while (true) {
    const res = await getPublishedBlogPosts({ page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/** Get a single published blog post by ID. */
export async function getPublishedBlogPost(blogPostId: number): Promise<BlogPost> {
  return http.get<BlogPost>('/client/blog-posts/', { blog_post_id: blogPostId })
}

/** Increment view count of a blog post. */
export async function increaseViews(blogPostId: number): Promise<BlogPost> {
  return http.patch<BlogPost>(`/client/blog-posts/increase-views/${blogPostId}/`, {})
}

// ─── Admin/Instructor endpoints ───────────────────────────────────────────────

/** Get paginated list of all blog posts (admin/instructor). */
export async function getAdminBlogPosts(
  params?: { page?: number; page_size?: number; blog_post_id?: number }
): Promise<PaginatedResponse<BlogPost>> {
  const query: Record<string, string | number> = {}
  if (params?.page) query.page = params.page
  if (params?.page_size) query.page_size = params.page_size
  if (params?.blog_post_id) query.blog_post_id = params.blog_post_id
  return http.get<PaginatedResponse<BlogPost>>('/admin/blog-posts/', query)
}

/** Get a single blog post by ID (admin). */
export async function getAdminBlogPost(blogPostId: number): Promise<BlogPost> {
  return http.get<BlogPost>('/admin/blog-posts/', { blog_post_id: blogPostId })
}

/** Create a new blog post. */
export async function createBlogPost(data: BlogPostCreateData): Promise<BlogPost> {
  return http.post<BlogPost>('/admin/blog-posts/create/', data)
}

/** Update a blog post (partial). */
export async function updateBlogPost(
  blogPostId: number,
  data: Partial<BlogPostCreateData>
): Promise<BlogPost> {
  return http.patch<BlogPost>(`/admin/blog-posts/update/${blogPostId}/`, data)
}

/** Delete a blog post. */
export async function deleteBlogPost(blogPostId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/admin/blog-posts/delete/${blogPostId}/`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format blog date to Vietnamese locale string. */
export function formatBlogDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Get status badge variant. */
export function getBlogStatusBadge(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'published': return 'default'
    case 'draft': return 'secondary'
    case 'archived': return 'destructive'
    default: return 'outline'
  }
}

/** Get status label in Vietnamese. */
export function getBlogStatusLabel(status: string): string {
  switch (status) {
    case 'published': return 'Đã xuất bản'
    case 'draft': return 'Bản nháp'
    case 'archived': return 'Đã lưu trữ'
    default: return status
  }
}

// ─── Blog Comments ────────────────────────────────────────────────────────────

/** Get comments for a blog post. */
export async function getBlogComments(
  params: { post_id: number; page?: number; page_size?: number }
): Promise<PaginatedResponse<BlogComment>> {
  const q: Record<string, string | number> = { post_id: params.post_id }
  if (params.page) q.page = params.page
  if (params.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<BlogComment>>('/blog_comments/', q)
}

/** Get all comments for a blog post. */
export async function getAllBlogComments(postId: number): Promise<BlogComment[]> {
  const all: BlogComment[] = []
  let page = 1
  while (true) {
    const res = await getBlogComments({ post_id: postId, page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/** Create a blog comment. */
export async function createBlogComment(data: {
  blog_post: number
  content: string
  user: number
  parent?: number | null
}): Promise<BlogComment> {
  return http.post<BlogComment>('/blog_comments/create/', data)
}

/** Update a blog comment. */
export async function updateBlogComment(
  commentId: number,
  data: Partial<{ content: string; status: string }>
): Promise<BlogComment> {
  return http.patch<BlogComment>(`/blog_comments/${commentId}/update/`, data)
}

/** Delete a blog comment. */
export async function deleteBlogComment(commentId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/blog_comments/${commentId}/delete/`)
}
