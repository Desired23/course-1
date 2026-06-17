import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../stores/modal.store'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Avatar } from './ui/avatar'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { SafeCommentContent } from './SafeCommentContent'
import {
  ThumbsUp,
  ThumbsDown,
  Reply,
  Flag,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Shield,
  Pin
} from 'lucide-react'
import { showNotification, withPermissionCheck, withAuthCheck } from '../utils/notifications'
import { confirmDialog } from '../utils/confirmDialog'
import { getErrorMessage } from '../lib/apiError'
import {
  getBlogComments,
  createBlogComment,
  updateBlogComment,
  deleteBlogComment,
  type BlogComment,
} from '../services/blog-comments.api'

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar: string
    role: string
    isVerified?: boolean
  }
  createdAt: Date
  updatedAt?: Date
  likes: number
  dislikes: number
  replies: Comment[]
  parentId?: string
  isEdited: boolean
  isPinned: boolean
  isApproved: 'pending' | 'approved' | 'rejected'
  moderationNote?: string
  votes: {
    userId: string
    type: 'up' | 'down'
  }[]
}

interface EnhancedCommentSystemProps {
  postId?: string
  postType?: string
  comments?: Comment[]
  onAddComment?: (content: string, parentId?: string) => void
  onUpdateComment?: (commentId: string, content: string) => void
  onDeleteComment?: (commentId: string) => void
  onVoteComment?: (commentId: string, voteType: 'up' | 'down') => void
  onPinComment?: (commentId: string) => void
  onReportComment?: (commentId: string) => void
  onApproveComment?: (commentId: string, status: 'approved' | 'rejected', note?: string) => void
  showModerationControls?: boolean
  showModeration?: boolean
  allowVoting?: boolean
  allowEditing?: boolean
  maxDepth?: number
}

const ROLE_MAP: Record<string, string> = {
  student: 'user',
  instructor: 'instructor',
  admin: 'admin',
}

function mapBlogComment(bc: BlogComment): Comment {
  return {
    id: String(bc.id),
    content: bc.content,
    author: {
      id: String(bc.user),
      name: bc.user_name || 'Anonymous',
      avatar: bc.user_avatar || '',
      role: bc.user_role ? (ROLE_MAP[bc.user_role] ?? bc.user_role) : 'user',
    },
    createdAt: new Date(bc.created_at),
    updatedAt: new Date(bc.updated_at),
    likes: bc.likes,
    dislikes: 0,
    replies: [],
    parentId: bc.parent ? String(bc.parent) : undefined,
    isEdited: bc.created_at !== bc.updated_at,
    isPinned: false,
    isApproved: bc.status === 'active' ? 'approved' : 'rejected',
    votes: [],
  }
}

export function EnhancedCommentSystem({
  postId,
  postType = 'general',
  comments: propComments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onVoteComment,
  onPinComment,
  onReportComment,
  onApproveComment,
  showModerationControls = false,
  showModeration = false,
  allowVoting = true,
  allowEditing = true,
  maxDepth = 3
}: EnhancedCommentSystemProps) {
  const { t } = useTranslation()
  const { user, isAuthenticated, hasPermission, hasRole } = useAuth()
  const { open: openLoginModal } = useModal('login')
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [internalComments, setInternalComments] = useState<Comment[]>([])
  const expandedInitialized = useRef(false)

  const isBlog = postType === 'blog' && !!postId

  useEffect(() => {
    if (!isBlog) return
    getBlogComments(postId!)
      .then(res => {
        const mapped = res.results.map(mapBlogComment)
        setInternalComments(mapped)
        if (!expandedInitialized.current) {
          expandedInitialized.current = true
          const toExpand = new Set(
            mapped
              .filter(c => !c.parentId)
              .filter(p => mapped.filter(r => r.parentId === p.id).length <= 2)
              .map(p => p.id)
          )
          setExpandedComments(toExpand)
        }
      })
      .catch(() => {})
  }, [postId, isBlog])

  const comments = propComments || internalComments

  const isAdmin = hasRole('admin')
  const canModerate = showModeration || showModerationControls || hasPermission('admin.comments.moderate') || hasPermission('instructor.comments.moderate') || isAdmin
  const canPin = hasPermission('admin.comments.moderate') || isAdmin

  const handleAddComment = () => {
    withAuthCheck(isAuthenticated, async () => {
      if (!newComment.trim()) {
        showNotification.warning(t('enhanced_comment_system.enter_comment'))
        return
      }

      if (onAddComment) {
        onAddComment(newComment)
      } else if (isBlog && user) {
        try {
          const created = await createBlogComment({
            blog_post: Number(postId),
            content: newComment,
            user: Number(user.id),
          })
          setInternalComments(prev => [mapBlogComment(created), ...prev])
        } catch {
          showNotification.warning(t('enhanced_comment_system.error_adding_comment', 'Lỗi khi đăng bình luận'))
          return
        }
      } else {
        const newCommentObj: Comment = {
          id: Date.now().toString(),
          author: {
            id: user?.id || 'current-user',
            name: user?.name || 'Current User',
            avatar: user?.avatar || '',
            role: 'Student',
          },
          content: newComment,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: undefined,
          likes: 0,
          dislikes: 0,
          replies: [],
          isEdited: false,
          isPinned: false,
          isApproved: 'approved',
          votes: [],
        }
        setInternalComments(prev => [newCommentObj, ...prev])
      }

      setNewComment('')
      showNotification.success(t('enhanced_comment_system.comment_added'))
    })
  }

  const handleAddReply = (parentId: string) => {
    withAuthCheck(isAuthenticated, async () => {
      if (!replyContent.trim()) {
        showNotification.warning(t('enhanced_comment_system.enter_reply'))
        return
      }

      if (onAddComment) {
        onAddComment(replyContent, parentId)
      } else if (isBlog && user) {
        try {
          const created = await createBlogComment({
            blog_post: Number(postId),
            content: replyContent,
            user: Number(user.id),
            parent: Number(parentId),
          })
          setInternalComments(prev => [...prev, mapBlogComment(created)])
        } catch {
          showNotification.warning(t('enhanced_comment_system.error_adding_comment', 'Lỗi khi đăng trả lời'))
          return
        }
      } else {
        const newReplyObj: Comment = {
          id: Date.now().toString(),
          author: {
            id: user?.id || 'current-user',
            name: user?.name || 'Current User',
            avatar: user?.avatar || '',
            role: 'Student',
          },
          content: replyContent,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId,
          likes: 0,
          dislikes: 0,
          replies: [],
          isEdited: false,
          isPinned: false,
          isApproved: 'approved',
          votes: [],
        }
        setInternalComments(prev => [...prev, newReplyObj])
      }

      setReplyContent('')
      setReplyingTo(null)
      showNotification.success(t('enhanced_comment_system.reply_added'))
    })
  }

  const handleEditComment = (commentId: string) => {
    if (!editContent.trim()) {
      showNotification.warning(t('enhanced_comment_system.enter_comment_content'))
      return
    }

    if (onUpdateComment) {
      onUpdateComment(commentId, editContent)
      setEditingComment(null)
      setEditContent('')
      showNotification.success(t('enhanced_comment_system.comment_updated'))
    } else if (isBlog) {
      const prevComments = [...internalComments]
      setInternalComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, content: editContent, isEdited: true, updatedAt: new Date() } : c
      ))
      setEditingComment(null)
      setEditContent('')
      updateBlogComment(Number(commentId), { content: editContent })
        .then(updated => {
          setInternalComments(prev => prev.map(c =>
            c.id === commentId ? mapBlogComment(updated) : c
          ))
          showNotification.success(t('enhanced_comment_system.comment_updated'))
        })
        .catch((e) => {
          setInternalComments(prevComments)
          showNotification.error(getErrorMessage(e, 'Không thể cập nhật bình luận.'))
        })
    } else {
      setInternalComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, content: editContent, isEdited: true, updatedAt: new Date() } : c
      ))
      setEditingComment(null)
      setEditContent('')
      showNotification.success(t('enhanced_comment_system.comment_updated'))
    }
  }

  const handleVote = (commentId: string, voteType: 'up' | 'down') => {
    withAuthCheck(isAuthenticated, () => {
      if (onVoteComment) {
        onVoteComment(commentId, voteType)
        return
      }

      setInternalComments(prev => prev.map(c => {
        if (c.id !== commentId) return c
        return voteType === 'up'
          ? { ...c, likes: c.likes + 1 }
          : { ...c, dislikes: c.dislikes + 1 }
      }))

      if (isBlog && voteType === 'up') {
        const target = internalComments.find(c => c.id === commentId)
        if (target) {
          updateBlogComment(Number(commentId), { likes: target.likes + 1 })
            .then(() => {
              showNotification.success(t('enhanced_comment_system.vote_recorded'))
            })
            .catch((e) => {
              setInternalComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, likes: c.likes - 1 } : c
              ))
              showNotification.error(getErrorMessage(e, 'Không thể ghi nhận vote.'))
            })
        }
      } else {
        showNotification.success(t('enhanced_comment_system.vote_recorded'))
      }
    })
  }

  const handlePin = (commentId: string) => {
    withPermissionCheck(hasPermission, 'admin.comments.moderate', () => {
      if (onPinComment) {
        onPinComment(commentId)
      } else {
        setInternalComments(prev => prev.map(c =>
          c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
        ))
      }
      showNotification.success(t('enhanced_comment_system.comment_pinned'))
    })
  }

  const handleReport = (commentId: string) => {
    withAuthCheck(isAuthenticated, () => {
      if (onReportComment) {
        onReportComment(commentId)
      } else {
        showNotification.info(t('enhanced_comment_system.report_submitted'))
      }
    })
  }

  const handleApprove = (commentId: string, status: 'approved' | 'rejected', note?: string) => {
    withPermissionCheck(hasPermission, 'admin.comments.moderate', () => {
      if (onApproveComment) {
        onApproveComment(commentId, status, note)
      } else {
        setInternalComments(prev => prev.map(c =>
          c.id === commentId ? { ...c, isApproved: status, moderationNote: note } : c
        ))
      }
      showNotification.success(t(`enhanced_comment_system.status_${status}_success`))
    })
  }

  const handleDelete = async (commentId: string) => {
    if (!await confirmDialog(t('enhanced_comment_system.confirm_delete'))) return

    if (onDeleteComment) {
      onDeleteComment(commentId)
      showNotification.success(t('enhanced_comment_system.comment_deleted'))
    } else if (isBlog) {
      const prevComments = [...internalComments]
      setInternalComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId))
      deleteBlogComment(Number(commentId))
        .then(() => {
          showNotification.success(t('enhanced_comment_system.comment_deleted'))
        })
        .catch((e) => {
          setInternalComments(prevComments)
          showNotification.error(getErrorMessage(e, 'Không thể xóa bình luận.'))
        })
    } else {
      setInternalComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId))
      showNotification.success(t('enhanced_comment_system.comment_deleted'))
    }
  }

  const toggleExpansion = (commentId: string) => {
    const newExpanded = new Set(expandedComments)
    if (expandedComments.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return t('enhanced_comment_system.days_ago', { count: days })
    if (hours > 0) return t('enhanced_comment_system.hours_ago', { count: hours })
    return t('enhanced_comment_system.just_now')
  }

  const getUserVote = (comment: Comment): 'up' | 'down' | null => {
    if (!user) return null
    const vote = comment.votes?.find(v => v.userId === user.id)
    return vote?.type || null
  }

  const getReplies = (commentId: string): Comment[] => {
    if (!comments || !Array.isArray(comments)) return []
    return comments.filter(c => c.parentId === commentId)
  }

  const renderComment = (comment: Comment, depth: number = 0) => {
    const replies = getReplies(comment.id)

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''} ${
          comment.isPinned ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
      >
        {comment.isPinned && (
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <Flag className="w-4 h-4" />
            <span className="text-sm font-medium">{t('enhanced_comment_system.pinned_comment')}</span>
          </div>
        )}

        <Card className={`mb-4 ${comment.isApproved === 'pending' ? 'border-yellow-300' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <img src={comment.author.avatar || '/default-avatar.png'} alt={comment.author.name} />
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comment.author.name}</span>
                    {comment.author.isVerified && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                    {comment.author.role === 'admin' && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {comment.author.role === 'instructor' && (
                      <Shield className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                    {comment.isEdited && <span>(edited)</span>}
                    <Badge variant="outline" className="text-xs">
                      {comment.author.role === 'admin' ? 'Admin'
                        : comment.author.role === 'instructor' ? 'Giảng viên'
                        : 'Học viên'}
                    </Badge>
                  </div>
                </div>
              </div>

              {showModerationControls && (
                <div className="flex items-center gap-2">
                  {comment.isApproved === 'pending' && (
                    <Badge variant="outline" className="text-yellow-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {t('enhanced_comment_system.pending')}
                    </Badge>
                  )}
                  {comment.isApproved === 'approved' && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('enhanced_comment_system.approved')}
                    </Badge>
                  )}
                  {comment.isApproved === 'rejected' && (
                    <Badge variant="outline" className="text-red-600">
                      <XCircle className="w-3 h-3 mr-1" />
                      {t('enhanced_comment_system.rejected')}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {editingComment === comment.id ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                    {t('enhanced_comment_system.save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null)
                      setEditContent('')
                    }}
                  >
                    {t('enhanced_comment_system.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <SafeCommentContent
                    content={comment.content}
                    textClassName="whitespace-pre-wrap"
                    codeClassName="text-xs font-mono"
                  />
                </div>

                {comment.moderationNote && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-400 mb-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>{t('enhanced_comment_system.moderation_note')}</strong> {comment.moderationNote}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {allowVoting && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(comment.id, 'up')}
                          className={`${getUserVote(comment) === 'up' ? 'text-green-600 bg-green-50' : ''}`}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {comment.likes}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(comment.id, 'down')}
                          className={`${getUserVote(comment) === 'down' ? 'text-red-600 bg-red-50' : ''}`}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          {comment.dislikes}
                        </Button>
                      </>
                    )}

                    {depth < maxDepth && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      >
                        <Reply className="w-4 h-4 mr-1" />
                        {t('enhanced_comment_system.reply')}
                      </Button>
                    )}

                    {replies.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpansion(comment.id)}
                      >
                        {expandedComments.has(comment.id)
                          ? t('enhanced_comment_system.hide_replies', { count: replies.length })
                          : t('enhanced_comment_system.show_replies', { count: replies.length })}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {user?.id === comment.author.id && allowEditing && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingComment(comment.id)
                            setEditContent(comment.content)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {user?.id !== comment.author.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReport(comment.id)}
                        className="text-muted-foreground hover:text-red-600"
                        title={t('enhanced_comment_system.report_comment')}
                      >
                        <Flag className="w-4 h-4" />
                      </Button>
                    )}

                    {canModerate && (
                      <>
                        {canPin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePin(comment.id)}
                            className={comment.isPinned ? 'text-blue-600' : ''}
                          >
                            <Pin className="w-4 h-4" />
                          </Button>
                        )}

                        {comment.isApproved === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(comment.id, 'approved')}
                              className="text-green-600"
                              title={t('enhanced_comment_system.approve')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(comment.id, 'rejected', t('enhanced_comment_system.inappropriate_content'))}
                              className="text-red-600"
                              title={t('enhanced_comment_system.reject')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {user?.id !== comment.author.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(comment.id)}
                            className="text-red-600"
                            title={t('enhanced_comment_system.delete_as_moderator')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            <AnimatePresence>
              {replyingTo === comment.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t"
                >
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} />
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={t('enhanced_comment_system.reply_to_author', { name: comment.author.name })}
                        className="mb-2"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAddReply(comment.id)}>
                          {t('enhanced_comment_system.reply')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                          {t('enhanced_comment_system.cancel')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <AnimatePresence>
          {expandedComments.has(comment.id) && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {replies.map(reply => renderComment(reply, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {isAuthenticated ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} />
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('enhanced_comment_system.write_comment')}
                  className="mb-3"
                  rows={3}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  {t('enhanced_comment_system.post_comment')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground mb-3">{t('enhanced_comment_system.login_to_comment')}</p>
            <Button onClick={() => openLoginModal()}>{t('enhanced_comment_system.login')}</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {comments
          .filter(c => !c.parentId)
          .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return b.createdAt.getTime() - a.createdAt.getTime()
          })
          .map(comment => renderComment(comment))}
      </div>
    </div>
  )
}
