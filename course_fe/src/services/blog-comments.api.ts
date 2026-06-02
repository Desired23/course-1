import { http } from './http'

export interface BlogComment {
  id: number
  blog_post: number
  content: string
  user: number
  user_name: string | null
  user_avatar: string | null
  user_role: 'student' | 'instructor' | 'admin' | null
  created_at: string
  updated_at: string
  parent: number | null
  likes: number
  status: 'active' | 'deleted'
  replies_count: number
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export async function getBlogComments(
  postId: number | string,
  page = 1,
  pageSize = 100
): Promise<PaginatedResponse<BlogComment>> {
  return http.get<PaginatedResponse<BlogComment>>('/blog_comments/', {
    post_id: postId,
    page,
    page_size: pageSize,
  })
}

export async function createBlogComment(data: {
  blog_post: number
  content: string
  user: number
  parent?: number | null
}): Promise<BlogComment> {
  return http.post<BlogComment>('/blog_comments/create/', data)
}

export async function updateBlogComment(
  commentId: number,
  data: Partial<{ content: string; likes: number }>
): Promise<BlogComment> {
  return http.patch<BlogComment>(`/blog_comments/${commentId}/update/`, data)
}

export async function deleteBlogComment(commentId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/blog_comments/${commentId}/delete/`)
}
