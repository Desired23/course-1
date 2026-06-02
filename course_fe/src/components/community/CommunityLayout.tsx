import React from 'react'
import { BookOpen, MessageSquare, LayoutGrid, Edit3, HelpCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { useRouter } from '../Router'
import { useAuth } from '../../contexts/AuthContext'

export function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { currentRoute, navigate } = useRouter()
  const { isAuthenticated, hasPermission } = useAuth()
  const canWriteBlog = hasPermission('instructor.blog.create')

  const currentPath = currentRoute.split('?')[0]
  const activeTab =
    currentPath.startsWith('/blog') ? 'blog' :
    currentPath.startsWith('/qa') ? 'qa' :
    'overview'

  const tabs = [
    { value: 'overview', label: 'Tổng quan', icon: LayoutGrid, path: '/community' },
    { value: 'blog', label: 'Blog', icon: BookOpen, path: '/blog' },
    { value: 'qa', label: 'Hỏi & Đáp', icon: MessageSquare, path: '/qa' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between">
            <nav className="flex gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.value}
                    onClick={() => navigate(tab.path)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.value
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-2 py-2">
              {canWriteBlog && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/blog/create')}
                  className="gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Viết bài</span>
                </Button>
              )}
              <Button
                size="sm"
                variant={isAuthenticated ? 'default' : 'outline'}
                onClick={() => navigate(isAuthenticated ? '/qa/ask' : '/login')}
                className="gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đặt câu hỏi</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
