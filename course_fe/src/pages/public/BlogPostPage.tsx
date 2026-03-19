import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Avatar } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Card, CardHeader, CardContent } from '../../components/ui/card'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  ThumbsUp, 
  ThumbsDown,
  Reply,
  MoreVertical,
  Flag,
  Edit,
  Trash2,
  Clock,
  Eye,
  Tag,
  ArrowLeft,
  Send,
  ChevronDown,
  ChevronUp,
  Quote
} from 'lucide-react'
import { toast } from 'sonner'
import { showNotification, withPermissionCheck, withAuthCheck } from '../../utils/notifications'
import { EnhancedCommentSystem, type Comment } from '../../components/EnhancedCommentSystem'

interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string
  author: {
    id: string
    name: string
    avatar: string
    role: string
    totalPosts: number
    followers: number
  }
  publishedAt: Date
  updatedAt: Date
  tags: string[]
  category: string
  featured: boolean
  status: 'draft' | 'published' | 'archived'
  stats: {
    views: number
    likes: number
    dislikes: number
    comments: number
    shares: number
    bookmarks: number
  }
  readTime: number
  coverImage?: string
}

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar: string
    role: string
  }
  createdAt: Date
  updatedAt?: Date
  likes: number
  dislikes: number
  replies: Reply[]
  parentId?: string
  isEdited: boolean
  isPinned: boolean
  status: 'pending' | 'approved' | 'rejected'
  reports: number
  adminNote?: string
}

interface Reply {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar: string
    role: string
  }
  createdAt: Date
  updatedAt?: Date
  likes: number
  dislikes: number
  isEdited: boolean
  status: 'pending' | 'approved' | 'rejected'
  reports: number
  adminNote?: string
}

// Mock data
const mockBlogPost: BlogPost = {
  id: '1',
  title: 'Mastering React Hooks: A Complete Guide for Modern Development',
  excerpt: 'Learn how to leverage React Hooks effectively in your applications with practical examples and best practices.',
  content: `
# Mastering React Hooks: A Complete Guide for Modern Development

React Hooks have revolutionized the way we write React applications. Introduced in React 16.8, hooks allow us to use state and other React features in functional components, making our code more readable and maintainable.

## What are React Hooks?

React Hooks are functions that let you "hook into" React state and lifecycle features from function components. They allow you to use state and other React features without writing a class.

## Basic Hooks

### useState

The \`useState\` hook is probably the most commonly used hook. It allows you to add state to functional components:

\`\`\`javascript
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

### useEffect

The \`useEffect\` hook lets you perform side effects in function components:

\`\`\`javascript
import React, { useState, useEffect } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`You clicked \${count} times\`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

## Advanced Hooks

### useContext

The \`useContext\` hook makes it easy to consume context in functional components:

\`\`\`javascript
const ThemeContext = React.createContext();

function MyComponent() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>Hello World</div>;
}
\`\`\`

### useReducer

For more complex state logic, \`useReducer\` is usually preferable to \`useState\`:

\`\`\`javascript
const initialState = {count: 0};

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return {count: state.count + 1};
    case 'decrement':
      return {count: state.count - 1};
    default:
      throw new Error();
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <>
      Count: {state.count}
      <button onClick={() => dispatch({type: 'decrement'})}>-</button>
      <button onClick={() => dispatch({type: 'increment'})}>+</button>
    </>
  );
}
\`\`\`

## Custom Hooks

One of the most powerful features of hooks is the ability to create your own custom hooks:

\`\`\`javascript
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
\`\`\`

## Best Practices

1. **Always use hooks at the top level** - Don't call hooks inside loops, conditions, or nested functions.
2. **Use ESLint plugin** - Install and use the ESLint plugin for React Hooks to catch common mistakes.
3. **Separate concerns** - Use multiple state variables instead of a single state object when possible.
4. **Custom hooks for logic reuse** - Extract component logic into custom hooks when you want to share logic between components.

## Conclusion

React Hooks have made functional components much more powerful and have simplified many patterns that were previously complex with class components. By mastering hooks, you can write cleaner, more maintainable React code.

Remember to follow the rules of hooks and leverage custom hooks for reusable logic. Happy coding!
  `,
  author: {
    id: '2',
    name: 'Jane Smith',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    role: 'Senior React Developer',
    totalPosts: 25,
    followers: 1250
  },
  publishedAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-16T14:30:00'),
  tags: ['React', 'JavaScript', 'Frontend', 'Hooks', 'Development'],
  category: 'Frontend Development',
  featured: true,
  status: 'published',
  stats: {
    views: 12840,
    likes: 456,
    dislikes: 12,
    comments: 89,
    shares: 156,
    bookmarks: 234
  },
  readTime: 8
}

const mockComments: Comment[] = [
  {
    id: '1',
    content: 'Excellent article! The examples are very clear and helped me understand hooks much better. I especially appreciated the custom hooks section.',
    author: {
      id: '3',
      name: 'Mike Johnson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      role: 'Frontend Developer'
    },
    createdAt: new Date('2024-01-15T12:30:00'),
    likes: 24,
    dislikes: 0,
    replies: [
      {
        id: '1-1',
        content: 'Thanks Mike! I\'m glad the examples were helpful. Custom hooks are definitely a game-changer.',
        author: {
          id: '2',
          name: 'Jane Smith',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
          role: 'Senior React Developer'
        },
        createdAt: new Date('2024-01-15T13:15:00'),
        likes: 12,
        dislikes: 0,
        isEdited: false
      }
    ],
    isEdited: false,
    isPinned: true
  },
  {
    id: '2',
    content: 'Could you explain more about the dependency array in useEffect? I sometimes get confused about when to include variables.',
    author: {
      id: '4',
      name: 'Sarah Wilson',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      role: 'Junior Developer'
    },
    createdAt: new Date('2024-01-15T14:45:00'),
    likes: 18,
    dislikes: 1,
    replies: [
      {
        id: '2-1',
        content: 'Great question! The dependency array tells React when to re-run the effect. Include any variables from component scope that are used inside the effect.',
        author: {
          id: '2',
          name: 'Jane Smith',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
          role: 'Senior React Developer'
        },
        createdAt: new Date('2024-01-15T15:20:00'),
        likes: 15,
        dislikes: 0,
        isEdited: false
      },
      {
        id: '2-2',
        content: 'I recommend using the ESLint plugin for hooks - it will warn you when you miss dependencies!',
        author: {
          id: '5',
          name: 'Alex Chen',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
          role: 'Tech Lead'
        },
        createdAt: new Date('2024-01-15T16:10:00'),
        likes: 8,
        dislikes: 0,
        isEdited: false
      }
    ],
    isEdited: false,
    isPinned: false
  }
]

export function BlogPostPage() {
  const { navigate } = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [post] = useState<BlogPost>(mockBlogPost)
  const [comments, setComments] = useState<Comment[]>(mockComments)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set())
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const handleBack = () => {
    navigate('/blog')
  }

  const handleLike = () => {
    if (isDisliked) setIsDisliked(false)
    setIsLiked(!isLiked)
    toast.success(isLiked ? 'Removed like' : 'Liked post!')
  }

  const handleDislike = () => {
    if (isLiked) setIsLiked(false)
    setIsDisliked(!isDisliked)
    toast.success(isDisliked ? 'Removed dislike' : 'Disliked post')
  }

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks!')
  }

  const handleShare = (platform: string) => {
    const url = window.location.href
    const title = post.title
    
    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
        break
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`)
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
        break
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)
        break
    }
    setShowShareMenu(false)
  }

  const handleAddComment = () => {
    if (!isAuthenticated) {
      toast.error('Please login to comment')
      return
    }
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment')
      return
    }

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: {
        id: user!.id,
        name: user!.name,
        avatar: user!.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        role: user!.roles.includes('instructor') ? 'Instructor' : 'Student'
      },
      createdAt: new Date(),
      likes: 0,
      dislikes: 0,
      replies: [],
      isEdited: false,
      isPinned: false
    }

    setComments([...comments, comment])
    setNewComment('')
    toast.success('Comment added!')
  }

  const handleAddReply = (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to reply')
      return
    }

    if (!replyContent.trim()) {
      toast.error('Please enter a reply')
      return
    }

    const reply: Reply = {
      id: `${commentId}-${Date.now()}`,
      content: replyContent,
      author: {
        id: user!.id,
        name: user!.name,
        avatar: user!.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        role: user!.roles.includes('instructor') ? 'Instructor' : 'Student'
      },
      createdAt: new Date(),
      likes: 0,
      dislikes: 0,
      isEdited: false
    }

    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, replies: [...comment.replies, reply] }
        : comment
    ))
    
    setReplyContent('')
    setReplyingTo(null)
    toast.success('Reply added!')
  }

  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to like comments')
      return
    }

    const newLiked = new Set(likedComments)
    const newDisliked = new Set(dislikedComments)
    
    if (likedComments.has(commentId)) {
      newLiked.delete(commentId)
    } else {
      newLiked.add(commentId)
      newDisliked.delete(commentId)
    }
    
    setLikedComments(newLiked)
    setDislikedComments(newDisliked)
  }

  const handleDislikeComment = (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to dislike comments')
      return
    }

    const newDisliked = new Set(dislikedComments)
    const newLiked = new Set(likedComments)
    
    if (dislikedComments.has(commentId)) {
      newDisliked.delete(commentId)
    } else {
      newDisliked.add(commentId)
      newLiked.delete(commentId)
    }
    
    setDislikedComments(newDisliked)
    setLikedComments(newLiked)
  }

  const toggleCommentExpansion = (commentId: string) => {
    const newExpanded = new Set(expandedComments)
    if (expandedComments.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} ngày trước`
    if (hours > 0) return `${hours} giờ trước`
    return 'Vừa xong'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Quay lại Blog
          </Button>
          
          {post.featured && (
            <Badge className="mb-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Bài viết nổi bật
            </Badge>
          )}
        </div>

        {/* Article */}
        <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Cover Image */}
          {post.coverImage && (
            <div className="aspect-video bg-gray-100 dark:bg-gray-700">
              <img 
                src={post.coverImage} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Header */}
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-12 h-12">
                <img src={post.author.avatar} alt={post.author.name} />
              </Avatar>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {post.author.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {post.author.role} • {post.author.totalPosts} bài viết • {post.author.followers} theo dõi
                </p>
              </div>
              <Button variant="outline" size="sm">
                Theo dõi
              </Button>
            </div>

            <h1 className="mb-4">{post.title}</h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>{formatDate(post.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye size={16} />
                <span>{post.stats.views.toLocaleString()} lượt xem</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>{post.readTime} phút đọc</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Tag size={12} className="mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={isLiked ? 'text-red-500' : ''}
                >
                  <Heart size={16} className={`mr-2 ${isLiked ? 'fill-current' : ''}`} />
                  {post.stats.likes + (isLiked ? 1 : 0)}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDislike}
                  className={isDisliked ? 'text-blue-500' : ''}
                >
                  <ThumbsDown size={16} className={`mr-2 ${isDisliked ? 'fill-current' : ''}`} />
                  {post.stats.dislikes + (isDisliked ? 1 : 0)}
                </Button>

                <Button variant="ghost" size="sm">
                  <MessageCircle size={16} className="mr-2" />
                  {post.stats.comments}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  className={isBookmarked ? 'text-yellow-500' : ''}
                >
                  <Bookmark size={16} className={isBookmarked ? 'fill-current' : ''} />
                </Button>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShareMenu(!showShareMenu)}
                  >
                    <Share2 size={16} />
                  </Button>
                  
                  <AnimatePresence>
                    {showShareMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                      >
                        <div className="p-2">
                          <button
                            onClick={() => handleShare('copy')}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            Sao chép liên kết
                          </button>
                          <button
                            onClick={() => handleShare('twitter')}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            Chia sẻ trên Twitter
                          </button>
                          <button
                            onClick={() => handleShare('facebook')}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            Chia sẻ trên Facebook
                          </button>
                          <button
                            onClick={() => handleShare('linkedin')}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            Chia sẻ trên LinkedIn
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <h3>Bình luận ({comments.length})</h3>
            </CardHeader>
            <CardContent>
              {/* Add Comment */}
              {isAuthenticated ? (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10">
                      <img src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'} alt={user?.name} />
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Viết bình luận của bạn..."
                        className="mb-3"
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                          <Send size={16} className="mr-2" />
                          Gửi bình luận
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    Đăng nhập để bình luận
                  </p>
                  <Button onClick={() => navigate('/login')}>
                    Đăng nhập
                  </Button>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${comment.isPinned ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4' : ''}`}
                  >
                    {comment.isPinned && (
                      <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                        <Flag size={16} />
                        <span className="text-sm font-medium">Bình luận được ghim</span>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <Avatar className="w-10 h-10">
                        <img src={comment.author.avatar} alt={comment.author.name} />
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {comment.author.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {comment.author.role}
                          </Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                          {comment.isEdited && (
                            <span className="text-xs text-gray-400">(đã chỉnh sửa)</span>
                          )}
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {comment.content}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center gap-1 hover:text-blue-600 ${
                              likedComments.has(comment.id) ? 'text-blue-600' : 'text-gray-500'
                            }`}
                          >
                            <ThumbsUp size={14} className={likedComments.has(comment.id) ? 'fill-current' : ''} />
                            {comment.likes + (likedComments.has(comment.id) ? 1 : 0)}
                          </button>
                          
                          <button
                            onClick={() => handleDislikeComment(comment.id)}
                            className={`flex items-center gap-1 hover:text-red-600 ${
                              dislikedComments.has(comment.id) ? 'text-red-600' : 'text-gray-500'
                            }`}
                          >
                            <ThumbsDown size={14} className={dislikedComments.has(comment.id) ? 'fill-current' : ''} />
                            {comment.dislikes + (dislikedComments.has(comment.id) ? 1 : 0)}
                          </button>
                          
                          <button
                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                            className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
                          >
                            <Reply size={14} />
                            Trả lời
                          </button>
                          
                          {comment.replies.length > 0 && (
                            <button
                              onClick={() => toggleCommentExpansion(comment.id)}
                              className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
                            >
                              {expandedComments.has(comment.id) ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                              {comment.replies.length} trả lời
                            </button>
                          )}
                        </div>
                        
                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4"
                          >
                            <div className="flex gap-3">
                              <Avatar className="w-8 h-8">
                                <img src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'} alt={user?.name} />
                              </Avatar>
                              <div className="flex-1">
                                <Textarea
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder={`Trả lời ${comment.author.name}...`}
                                  className="mb-2"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleAddReply(comment.id)}
                                    disabled={!replyContent.trim()}
                                  >
                                    Gửi
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => setReplyingTo(null)}
                                  >
                                    Hủy
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        
                        {/* Replies */}
                        <AnimatePresence>
                          {expandedComments.has(comment.id) && comment.replies.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-4"
                            >
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex gap-3">
                                  <Avatar className="w-8 h-8">
                                    <img src={reply.author.avatar} alt={reply.author.name} />
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {reply.author.name}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {reply.author.role}
                                      </Badge>
                                      <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {formatRelativeTime(reply.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                      {reply.content}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm">
                                      <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600">
                                        <ThumbsUp size={12} />
                                        {reply.likes}
                                      </button>
                                      <button className="flex items-center gap-1 text-gray-500 hover:text-red-600">
                                        <ThumbsDown size={12} />
                                        {reply.dislikes}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}