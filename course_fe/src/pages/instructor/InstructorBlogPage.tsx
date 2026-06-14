import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Plus, Search, MoreVertical, Pencil, Trash2, Eye, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '../../components/Router'
import {
  type BlogPost,
  getAdminBlogPosts,
  deleteBlogPost,
  getBlogStatusLabel,
  getBlogStatusBadge,
  formatBlogDate,
} from '../../services/blog-posts.api'

export function InstructorBlogPage() {
  const { navigate } = useRouter()

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  const PAGE_SIZE = 15

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAdminBlogPosts({ page, page_size: PAGE_SIZE })
      const filtered = search
        ? res.results.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
        : res.results
      setPosts(filtered)
      setTotalPages(res.total_pages)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteBlogPost(deleteTarget.id)
      toast.success('Đã xóa bài viết')
      setDeleteTarget(null)
      fetchPosts()
    } catch {
      toast.error('Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bài viết blog</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý bài viết của bạn</p>
        </div>
        <Button onClick={() => navigate('/blog/create')}>
          <Plus className="w-4 h-4 mr-2" /> Tạo bài viết
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tiêu đề..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">Tìm</Button>
      </form>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tiêu đề</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Trạng thái</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-24 hidden sm:table-cell">Lượt xem</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-32 hidden md:table-cell">Ngày tạo</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-3/4" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Chưa có bài viết nào</p>
                  <Button variant="link" onClick={() => navigate('/blog/create')}>
                    Tạo bài viết đầu tiên →
                  </Button>
                </td>
              </tr>
            ) : (
              posts.map(post => (
                <tr key={post.id} className="border-b hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span
                      className="font-medium text-blue-700 hover:underline cursor-pointer line-clamp-1"
                      onClick={() => navigate(`/blog/${post.slug}`)}
                    >
                      {post.title}
                    </span>
                    {post.summary && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{post.summary}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getBlogStatusBadge(post.status)}>
                      {getBlogStatusLabel(post.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {post.views}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                    {formatBlogDate(post.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/blog/create?edit=${post.id}`)}>
                          <Pencil className="w-4 h-4 mr-2" /> Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteTarget(post)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            ← Trước
          </Button>
          <span className="flex items-center text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Sau →
          </Button>
        </div>
      )}

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài viết?</AlertDialogTitle>
            <AlertDialogDescription>
              Bài viết <strong>"{deleteTarget?.title}"</strong> sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
