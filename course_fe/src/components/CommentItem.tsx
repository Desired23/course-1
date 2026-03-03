import React, { useState } from 'react'
import {
  ThumbsUp,
  Reply,
  Pencil,
  Trash2,
  MoreVertical,
  X,
  Check
} from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

interface CommentItemProps {
  comment: any
  replyingTo: number | null
  setReplyingTo: (id: number | null) => void
  onPostReply: (parentId: number, content: string) => void
  onEditComment?: (commentId: number, newContent: string) => void
  onDeleteComment?: (commentId: number) => void
  currentUser?: string
  isReply?: boolean
}

export function CommentItem({ 
  comment, 
  replyingTo, 
  setReplyingTo, 
  onPostReply,
  onEditComment,
  onDeleteComment,
  currentUser = 'You', // Default to 'You' for demo purposes
  isReply = false 
}: CommentItemProps) {
  const [replyContent, setReplyContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return
    onPostReply(comment.id, replyContent)
    setReplyContent('')
    setReplyingTo(null)
  }

  const handleSaveEdit = () => {
    if (!editContent.trim()) return
    if (onEditComment) {
      onEditComment(comment.id, editContent)
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  const isOwner = comment.user === currentUser || comment.user === 'You' // Simple check
  const isAdminOrInstructor = currentUser === 'Instructor Team' // Mock role check

  // Can delete if owner OR admin/instructor
  const canDelete = isOwner || isAdminOrInstructor
  // Can edit if owner
  const canEdit = isOwner

  if (comment.status === 'deleted') {
     return (
       <div className={`group ${isReply ? "mt-4" : "mb-6"}`}>
          <div className="flex gap-3">
             <div className={`rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground ${isReply ? "h-6 w-6" : "h-8 w-8"}`}>
                <Trash2 className="h-3 w-3" />
             </div>
             <div className="flex-1">
                <div className="text-sm text-muted-foreground italic bg-muted/20 p-2 rounded">
                   Comment deleted
                </div>
                
                {/* Still show nested replies even if parent is deleted */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 space-y-4">
                     {comment.replies.map((reply: any) => (
                       <CommentItem 
                         key={reply.id} 
                         comment={reply} 
                         isReply={true}
                         replyingTo={replyingTo}
                         setReplyingTo={setReplyingTo}
                         onPostReply={onPostReply}
                         onEditComment={onEditComment}
                         onDeleteComment={onDeleteComment}
                         currentUser={currentUser}
                       />
                     ))}
                  </div>
                )}
             </div>
          </div>
       </div>
     )
  }

  return (
    <div className={`group ${isReply ? "mt-4" : "mb-6"}`}>
      <div className="flex gap-3">
         <div className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs select-none ${
           isReply ? "h-6 w-6 text-[10px]" : "h-8 w-8"
         } ${
           comment.user === 'Instructor Team' 
             ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" 
             : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
         }`}>
            {comment.avatar}
         </div>
         <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-sm">
                {comment.user}
                {comment.user === 'Instructor Team' && (
                  <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-normal">Instructor</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{comment.date}</span>
                
                {(canEdit || canDelete) && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Pencil className="h-3 w-3 mr-2" /> Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDeleteComment && onDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] text-sm mb-2"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 px-3">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} className="h-7 px-3">
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1 mb-2 whitespace-pre-wrap">{comment.content}</p>
            )}
            
            {!isEditing && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                 <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <ThumbsUp className="h-3 w-3" /> {comment.likes}
                 </button>
                 <button 
                   onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                   className="flex items-center gap-1 hover:text-foreground transition-colors"
                 >
                    <Reply className="h-3 w-3" /> Reply
                 </button>
              </div>
            )}

            {/* Reply Input */}
            {replyingTo === comment.id && !isEditing && (
              <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                 <div className="flex-1">
                   <Textarea
                     autoFocus
                     value={replyContent}
                     onChange={(e) => setReplyContent(e.target.value)}
                     placeholder="Write a reply..."
                     className="w-full bg-muted/30 border rounded-md p-2 text-xs min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-2"
                   />
                   <div className="flex justify-end gap-2">
                     <Button 
                       size="sm" 
                       variant="ghost" 
                       className="h-7 text-xs"
                       onClick={() => {
                         setReplyingTo(null)
                         setReplyContent('')
                       }}
                     >
                       Cancel
                     </Button>
                     <Button 
                       size="sm" 
                       className="h-7 text-xs"
                       disabled={!replyContent.trim()}
                       onClick={handleSubmitReply}
                     >
                       Reply
                     </Button>
                   </div>
                 </div>
              </div>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 pl-4 border-l-2 space-y-4">
                 {comment.replies.map((reply: any) => (
                   <CommentItem 
                     key={reply.id} 
                     comment={reply} 
                     isReply={true}
                     replyingTo={replyingTo}
                     setReplyingTo={setReplyingTo}
                     onPostReply={onPostReply}
                     onEditComment={onEditComment}
                     onDeleteComment={onDeleteComment}
                     currentUser={currentUser}
                   />
                 ))}
              </div>
            )}
         </div>
      </div>
    </div>
  )
}
