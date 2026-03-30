import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
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
  MoreVertical, 
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
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  
  // Internal state for comments if not provided via props
  const [internalComments, setInternalComments] = useState<Comment[]>([
    {
      id: '1',
      author: {
        id: 'user1',
        name: 'John Developer',
        avatar: '/api/placeholder/40/40',
        role: 'Student'
      },
      content: 'Great post! This is exactly what I was looking for.',
      createdAt: new Date('2024-01-15T10:30:00'),
      updatedAt: new Date('2024-01-15T10:30:00'),
      parentId: null,
      upvotes: 5,
      downvotes: 0,
      isEdited: false,
      isPinned: false,
      isApproved: 'approved',
      votes: []
    },
    {
      id: '2',
      author: {
        id: 'user2',
        name: 'Sarah Designer',
        avatar: '/api/placeholder/40/40',
        role: 'Instructor'
      },
      content: 'Thanks for sharing this! I learned something new today.',
      createdAt: new Date('2024-01-15T11:15:00'),
      updatedAt: new Date('2024-01-15T11:15:00'),
      parentId: null,
      upvotes: 3,
      downvotes: 0,
      isEdited: false,
      isPinned: false,
      isApproved: 'approved',
      votes: []
    },
    {
      id: '3',
      author: {
        id: 'user3',
        name: 'Mike Frontend',
        avatar: '/api/placeholder/40/40',
        role: 'Student'
      },
      content: 'I agree with John, this is very helpful information.',
      createdAt: new Date('2024-01-15T12:00:00'),
      updatedAt: new Date('2024-01-15T12:00:00'),
      parentId: '1',
      upvotes: 2,
      downvotes: 0,
      isEdited: false,
      isPinned: false,
      isApproved: 'approved',
      votes: []
    }
  ])
  
  // Use provided comments or internal state
  const comments = propComments || internalComments || []

  const isAdmin = hasRole('admin')
  const canModerate = showModeration || showModerationControls || hasPermission('admin.comments.moderate') || hasPermission('instructor.comments.moderate') || isAdmin
  const canPin = hasPermission('admin.comments.moderate') || isAdmin

  const handleAddComment = () => {
    withAuthCheck(isAuthenticated, () => {
      if (!newComment.trim()) {
        showNotification.warning(t('enhanced_comment_system.enter_comment'))
        return
      }
      
      if (onAddComment) {
        onAddComment(newComment)
      } else {
        // Internal comment management
        const newCommentObj: Comment = {
          id: Date.now().toString(),
          author: {
            id: user?.id || 'current-user',
            name: user?.name || 'Current User',
            avatar: user?.avatar || '/api/placeholder/40/40',
            role: user?.role || 'Student'
          },
          content: newComment,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null,
          upvotes: 0,
          downvotes: 0,
          isEdited: false,
          isPinned: false,
          isApproved: 'approved',
          votes: []
        }
        setInternalComments(prev => [...prev, newCommentObj])
      }
      
      setNewComment('')
      showNotification.success(t('enhanced_comment_system.comment_added'))
    })
  }

  const handleAddReply = (parentId: string) => {
    withAuthCheck(isAuthenticated, () => {
      if (!replyContent.trim()) {
        showNotification.warning(t('enhanced_comment_system.enter_reply'))
        return
      }
      
      if (onAddComment) {
        onAddComment(replyContent, parentId)
      } else {
        // Internal comment management
        const newReplyObj: Comment = {
          id: Date.now().toString(),
          author: {
            id: user?.id || 'current-user',
            name: user?.name || 'Current User',
            avatar: user?.avatar || '/api/placeholder/40/40',
            role: user?.role || 'Student'
          },
          content: replyContent,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: parentId,
          upvotes: 0,
          downvotes: 0,
          isEdited: false,
          isPinned: false,
          isApproved: 'approved',
          votes: []
        }
        setInternalComments(prev => [...prev, newReplyObj])
      }
      
      setReplyContent('')
      setReplyingTo(null)
      showNotification.success(t('enhanced_comment_system.reply_added'))
    })
  }

  const handleEditComment = (commentId: string, content: string) => {
    if (!editContent.trim()) {
      showNotification.warning(t('enhanced_comment_system.enter_comment_content'))
      return
    }
    
    if (onUpdateComment) {
      onUpdateComment(commentId, editContent)
    } else {
      // Internal comment management
      setInternalComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, content: editContent, isEdited: true, updatedAt: new Date() }
          : comment
      ))
    }
    
    setEditingComment(null)
    setEditContent('')
    showNotification.success(t('enhanced_comment_system.comment_updated'))
  }

  const handleVote = (commentId: string, voteType: 'up' | 'down') => {
    withAuthCheck(isAuthenticated, () => {
      if (onVoteComment) {
        onVoteComment(commentId, voteType)
      } else {
        // Internal voting management
        setInternalComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            const newComment = { ...comment }
            if (voteType === 'up') {
              newComment.upvotes += 1
            } else {
              newComment.downvotes += 1
            }
            return newComment
          }
          return comment
        }))
        showNotification.success(t('enhanced_comment_system.vote_recorded'))
      }
    })
  }

  const handlePin = (commentId: string) => {
    withPermissionCheck(hasPermission, 'admin.comments.moderate', () => {
      if (onPinComment) {
        onPinComment(commentId)
      } else {
        // Internal pin management
        setInternalComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, isPinned: !comment.isPinned }
            : comment
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
        // Internal approval management
        setInternalComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, isApproved: status, moderationNote: note }
            : comment
        ))
      }
      showNotification.success(t(`enhanced_comment_system.status_${status}_success`))
    })
  }

  const handleDelete = (commentId: string) => {
    if (window.confirm(t('enhanced_comment_system.confirm_delete'))) {
      if (onDeleteComment) {
        onDeleteComment(commentId)
      } else {
        // Internal delete management - remove comment and its replies
        setInternalComments(prev => prev.filter(comment => 
          comment.id !== commentId && comment.parentId !== commentId
        ))
      }
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
                <img src={comment.author.avatar} alt={comment.author.name} />
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
                    {comment.author.role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Moderation Status */}
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
                <Button 
                  size="sm" 
                  onClick={() => handleEditComment(comment.id, editContent)}
                >
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
            {/* Author controls */}
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

            {/* Report control for non-authors */}
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

            {/* Moderation controls */}
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

                      {/* Only show Moderator Delete if the user is NOT the author (to avoid duplicate buttons) */}
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

          {/* Reply Form */}
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
                      <Button 
                        size="sm" 
                        onClick={() => handleAddReply(comment.id)}
                      >
                        {t('enhanced_comment_system.reply')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setReplyingTo(null)}
                      >
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

      {/* Nested Replies */}
      <AnimatePresence>
        {(expandedComments.has(comment.id) || replies.length <= 2) && 
         replies.length > 0 && (
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
      {/* Add Comment Form */}
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
            <Button>{t('enhanced_comment_system.login')}</Button>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments
          .filter(comment => !comment.parentId)
          .sort((a, b) => {
            // Pin comments first, then by date
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return b.createdAt.getTime() - a.createdAt.getTime()
          })
          .map(comment => renderComment(comment))}
      </div>
    </div>
  )
}
