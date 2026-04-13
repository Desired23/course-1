import { MessageCircle, X, Send, Minus, GripHorizontal, Paperclip, Smile, Image as ImageIcon, MoreVertical, Reply, Pencil, Undo2, Info, Users, UserPlus, LogOut, Trash2, Save, FileText, FileArchive, FileSpreadsheet, FileCode2, FileVideo, RefreshCw, AlertCircle, Flag } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react'
import { motion, AnimatePresence, useDragControls } from 'motion/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { addConversationParticipants, getOrCreateConversation, removeConversationParticipant, reportConversationMessage, searchChatUsers, updateConversation, updateConversationParticipant, type ChatUserSummary } from '../services/chat.api'
import { createUploadTask } from '../services/upload.api'
import { ChatWidgetHeader } from './chat-widget/ChatWidgetHeader'
import { ChatConversationCard } from './chat-widget/ChatConversationCard'
import { ChatEmptyState } from './chat-widget/ChatEmptyState'
import { ChatTypingIndicator } from './chat-widget/ChatTypingIndicator'

export function ChatWidget() {
  const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
  const MAX_ATTACHMENTS_PER_MESSAGE = 5
  const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
  ])

  const { t } = useTranslation()
  const { state, toggleChat, sendMessage, setActiveConversation, editMessage, revokeMessage, toggleReaction, refreshConversation, loadOlderMessages } = useChat()
  const { user } = useAuth()
  const [messageInput, setMessageInput] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<{
    id: string
    senderName: string
    content: string
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [alignment, setAlignment] = useState({ x: 'right', y: 'bottom' })
  const [isTyping, setIsTyping] = useState(false)
  const [showConversationInfo, setShowConversationInfo] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [isDragOverAttachments, setIsDragOverAttachments] = useState(false)
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null)
  const [conversationTitle, setConversationTitle] = useState('')
  const [conversationActionLoading, setConversationActionLoading] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [userSearchResults, setUserSearchResults] = useState<ChatUserSummary[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatUserSummary[]>([])
  const [infoUserSearchQuery, setInfoUserSearchQuery] = useState('')
  const [infoUserSearchLoading, setInfoUserSearchLoading] = useState(false)
  const [infoUserSearchResults, setInfoUserSearchResults] = useState<ChatUserSummary[]>([])
  const [shouldStickToBottom, setShouldStickToBottom] = useState(true)
  const [pendingAttachments, setPendingAttachments] = useState<Array<{
    id: string
    file: File
    kind: 'image' | 'video' | 'file'
    fileName: string
    mimeType: string
    fileSize: number
    previewUrl?: string
    status: 'queued' | 'uploading' | 'uploaded' | 'error' | 'cancelled'
    progress: number
    fileUrl?: string
    publicId?: string
    error?: string
    canRetry?: boolean
  }>>([])

  const dragControls = useDragControls()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAbortMapRef = useRef<Record<string, () => void>>({})
  const pendingAttachmentsRef = useRef(pendingAttachments)


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      viewportRef.current = scrollContainer
      if (scrollContainer && shouldStickToBottom) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [state.messages, state.activeConversationId, isTyping, shouldStickToBottom])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !state.activeConversationId) return

    const handleScroll = () => {
      const nearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80
      setShouldStickToBottom(nearBottom)
      if (viewport.scrollTop <= 40) {
        void loadOlderMessages(state.activeConversationId)
      }
    }

    viewport.addEventListener('scroll', handleScroll)
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [state.activeConversationId, loadOlderMessages])

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments
  }, [pendingAttachments])

  const handleDragEnd = () => {
    setTimeout(() => setIsDragging(false), 50)
  }

  const handleToggle = () => {
    if (isDragging) return

    if (!state.isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = rect.left + rect.width / 2 > window.innerWidth / 2 ? 'right' : 'left'
      const y = rect.top + rect.height / 2 > window.innerHeight / 2 ? 'bottom' : 'top'
      setAlignment({ x, y })
    }

    toggleChat()
  }

  const activeConversation = state.conversations.find(
    c => c.id === state.activeConversationId
  )
  const activeParticipants = activeConversation?.participants || []
  const activeParticipantIdsKey = activeParticipants
    .map((participant) => Number(participant.id))
    .sort((a, b) => a - b)
    .join(',')
  const currentUserParticipant = activeParticipants.find((participant) => String(participant.id) === String(user?.id ?? ''))
  const otherParticipant = activeParticipants.find((participant) => String(participant.id) !== String(user?.id ?? ''))
  const canManageParticipants = activeConversation?.type === 'group' && ['owner', 'admin'].includes(currentUserParticipant?.role || '')
  const canChangeRoles = activeConversation?.type === 'group' && currentUserParticipant?.role === 'owner'
  const conversationDisplayName = activeConversation?.type === 'group'
    ? (activeConversation.title || t('chat_widget.group_chat'))
    : (otherParticipant?.name || t('chat_widget.unknown'))
  const conversationSubtitle = activeConversation?.type === 'group'
    ? t('chat_widget.member_count', { count: activeParticipants.length })
    : (isTyping ? t('chat_widget.typing') : (otherParticipant?.name || t('chat_widget.unknown')))
  const conversationAvatarLabel = activeConversation?.type === 'group'
    ? (conversationDisplayName || 'G').slice(0, 2).toUpperCase()
    : (otherParticipant?.name?.charAt(0) || 'U')


  const messages = state.activeConversationId ? state.messages[state.activeConversationId] || [] : []
  const previewAttachment = pendingAttachments.find((attachment) => attachment.id === previewAttachmentId) || null

  useEffect(() => {
    if (activeConversation?.type === 'group') {
      setConversationTitle(activeConversation.title || '')
    } else {
      setConversationTitle('')
    }
  }, [activeConversation?.id, activeConversation?.title, activeConversation?.type])

  useEffect(() => {
    setShouldStickToBottom(true)
  }, [state.activeConversationId])

  useEffect(() => {
    if (!showCreateGroup || userSearchQuery.trim().length < 2) {
      setUserSearchResults([])
      setUserSearchLoading(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setUserSearchLoading(true)
        const response = await searchChatUsers(userSearchQuery.trim(), 8)
        setUserSearchResults(response.results || [])
      } catch {
        setUserSearchResults([])
      } finally {
        setUserSearchLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [showCreateGroup, userSearchQuery])

  useEffect(() => {
    if (!showConversationInfo || activeConversation?.type !== 'group' || infoUserSearchQuery.trim().length < 2) {
      setInfoUserSearchResults((current) => (current.length === 0 ? current : []))
      setInfoUserSearchLoading(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setInfoUserSearchLoading(true)
        const response = await searchChatUsers(infoUserSearchQuery.trim(), 8)
        const existingIds = new Set(activeParticipants.map((participant) => Number(participant.id)))
        setInfoUserSearchResults((response.results || []).filter((candidate) => !existingIds.has(candidate.id)))
      } catch {
        setInfoUserSearchResults([])
      } finally {
        setInfoUserSearchLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [showConversationInfo, activeConversation?.type, activeParticipantIdsKey, infoUserSearchQuery])

  useEffect(() => () => {
    Object.values(uploadAbortMapRef.current).forEach((abort) => abort())
    uploadAbortMapRef.current = {}
    pendingAttachmentsRef.current.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
    })
  }, [])

  const clearAttachmentResources = (attachment: { previewUrl?: string; id: string }) => {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl)
    }
    delete uploadAbortMapRef.current[attachment.id]
  }

  const handleSendMessage = async () => {
    if (!state.activeConversationId || !activeConversation || !user) return
    if (!messageInput.trim() && !hasUploadedAttachments) return
    if (hasUploadingAttachments) return

    const conversationId = state.activeConversationId
    const text = messageInput.trim()
    const uploadedAttachments = pendingAttachments
      .filter((attachment) => attachment.status === 'uploaded' && attachment.fileUrl)
      .map((attachment) => ({
        kind: attachment.kind,
        fileUrl: attachment.fileUrl!,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        thumbnailUrl: attachment.kind === 'image' ? attachment.fileUrl : undefined,
      }))

    sendMessage(conversationId, {
      senderId: user.id,
        senderName: user.name || t('chat.you'),
      content: text,
      type: uploadedAttachments[0]?.kind || 'text',
      replyToMessageId: replyingTo?.id,
      attachments: uploadedAttachments,
    })

    setMessageInput('')
    setReplyingTo(null)
    pendingAttachments.forEach((attachment) => {
      clearAttachmentResources(attachment)
    })
    setPendingAttachments([])
    setPreviewAttachmentId(null)
  }

  const handlePickAttachment = () => {
    fileInputRef.current?.click()
  }

  const processAttachmentFiles = async (files: File[]) => {
    if (!files.length) return

    const remainingSlots = Math.max(0, MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachmentsRef.current.length)
    const filesToProcess = files.slice(0, remainingSlots)

    if (files.length > remainingSlots) {
      setPendingAttachments((current) => [
        ...current,
        {
          id: `attachment-limit-${Date.now()}`,
          file: files[0],
          kind: 'file',
      fileName: t('chat_widget.attachment_limit_title'),
          mimeType: 'text/plain',
          fileSize: 0,
          status: 'error',
          progress: 0,
          error: t('chat_widget.attachment_limit_error', { count: MAX_ATTACHMENTS_PER_MESSAGE }),
          canRetry: false,
        },
      ])
    }

    const validAttachments = filesToProcess.flatMap((file) => {
      const mimeType = file.type || 'application/octet-stream'
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType)) {
        setPendingAttachments((current) => [
          ...current,
          {
            id: `attachment-${Date.now()}-${file.name}`,
            file,
            kind: inferAttachmentKind(mimeType),
            fileName: file.name,
            mimeType,
            fileSize: file.size,
            status: 'error',
            progress: 0,
            error: t('chat_widget.unsupported_file_type'),
            canRetry: false,
          },
        ])
        return []
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setPendingAttachments((current) => [
          ...current,
          {
            id: `attachment-${Date.now()}-${file.name}`,
            file,
            kind: inferAttachmentKind(mimeType),
            fileName: file.name,
            mimeType,
            fileSize: file.size,
            status: 'error',
            progress: 0,
            error: t('chat_widget.file_too_large'),
            canRetry: false,
          },
        ])
        return []
      }

      return [{
        id: `attachment-${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        kind: inferAttachmentKind(mimeType),
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        previewUrl: mimeType.startsWith('image/') || mimeType.startsWith('video/') ? URL.createObjectURL(file) : undefined,
        status: 'queued' as const,
        progress: 0,
        canRetry: true,
      }]
    })

    if (validAttachments.length > 0) {
      setPendingAttachments((current) => [...current, ...validAttachments])
      for (const attachment of validAttachments) {
        void uploadPendingAttachment(attachment)
      }
    }
  }

  const uploadPendingAttachment = async (target: typeof pendingAttachments[number]) => {
    const attachmentId = target.id

    setPendingAttachments((current) => current.map((attachment) => (
      attachment.id === attachmentId
        ? { ...attachment, status: 'uploading', progress: 0, error: undefined }
        : attachment
    )))

    try {
      const uploadTask = createUploadTask(
        target.file,
        { folder: 'chat-attachments', resource_type: 'auto' },
        (percent) => {
          setPendingAttachments((current) => current.map((attachment) => (
            attachment.id === attachmentId
              ? { ...attachment, status: 'uploading', progress: percent }
              : attachment
          )))
        },
      )
      uploadAbortMapRef.current[attachmentId] = uploadTask.abort
      const uploaded = await uploadTask.promise

      setPendingAttachments((current) => current.map((attachment) => (
        attachment.id === attachmentId
          ? {
              ...attachment,
              status: 'uploaded',
              progress: 100,
              fileUrl: uploaded.url,
              publicId: uploaded.public_id,
            }
          : attachment
      )))
    } catch (error) {
      const isCancelled = error instanceof DOMException && error.name === 'AbortError'
      setPendingAttachments((current) => current.map((attachment) => (
        attachment.id === attachmentId
          ? {
              ...attachment,
              status: isCancelled ? 'cancelled' : 'error',
              error: isCancelled
                ? t('chat_widget.upload_cancelled')
                : (error instanceof Error ? error.message : t('chat_widget.upload_failed')),
              canRetry: true,
            }
          : attachment
      )))
    } finally {
      delete uploadAbortMapRef.current[attachmentId]
    }
  }

  const handleAttachmentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    await processAttachmentFiles(files)
    event.target.value = ''
  }

  const handleCancelAllPendingAttachments = () => {
    Object.values(uploadAbortMapRef.current).forEach((abort) => abort())
    setPendingAttachments((current) => {
      current.forEach((attachment) => clearAttachmentResources(attachment))
      return []
    })
    setPreviewAttachmentId(null)
  }

  const handleAttachmentDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOverAttachments(false)
    await processAttachmentFiles(Array.from(event.dataTransfer.files || []))
  }

  const handleAttachmentDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOverAttachments(true)
  }

  const handleAttachmentDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOverAttachments(false)
    }
  }

  const handleRemovePendingAttachment = (attachmentId: string) => {
    const abort = uploadAbortMapRef.current[attachmentId]
    if (abort) {
      abort()
    }
    if (previewAttachmentId === attachmentId) {
      setPreviewAttachmentId(null)
    }
    setPendingAttachments((current) => {
      const target = current.find((attachment) => attachment.id === attachmentId)
      if (target) {
        clearAttachmentResources(target)
      }
      return current.filter((attachment) => attachment.id !== attachmentId)
    })
  }

  const handleCancelPendingAttachment = (attachmentId: string) => {
    const abort = uploadAbortMapRef.current[attachmentId]
    if (!abort) return
    abort()
  }

  const handleRetryPendingAttachment = async (attachmentId: string) => {
    const target = pendingAttachmentsRef.current.find((attachment) => attachment.id === attachmentId)
    if (!target) return
    await uploadPendingAttachment(target)
  }

  const handleBackToConversations = () => {
    setActiveConversation(null)
  }

  const handleAddSelectedUser = (candidate: ChatUserSummary) => {
    setSelectedUsers((current) => (
      current.some((item) => item.id === candidate.id)
        ? current
        : [...current, candidate]
    ))
    setUserSearchQuery('')
    setUserSearchResults([])
  }

  const handleRemoveSelectedUser = (userIdToRemove: number) => {
    setSelectedUsers((current) => current.filter((item) => item.id !== userIdToRemove))
  }

  const resetCreateGroupDialog = () => {
    setGroupTitle('')
    setUserSearchQuery('')
    setUserSearchResults([])
    setSelectedUsers([])
    setUserSearchLoading(false)
  }

  const resetConversationInfoSearch = () => {
    setInfoUserSearchQuery('')
    setInfoUserSearchResults([])
    setInfoUserSearchLoading(false)
  }

  const handleCreateGroup = async () => {
    if (!user || selectedUsers.length < 2 || !groupTitle.trim()) return
    try {
      setConversationActionLoading(true)
      const conversation = await getOrCreateConversation({
        type: 'group',
        title: groupTitle.trim(),
        participant_ids: selectedUsers.map((member) => member.id),
      })
      setShowCreateGroup(false)
      resetCreateGroupDialog()
      await refreshConversation(String(conversation.id))
      setActiveConversation(String(conversation.id))
    } finally {
      setConversationActionLoading(false)
    }
  }

  const handleSaveConversationInfo = async () => {
    if (!activeConversation || activeConversation.type !== 'group' || !conversationTitle.trim()) return
    try {
      setConversationActionLoading(true)
      await updateConversation(Number(activeConversation.id), { title: conversationTitle.trim() })
      await refreshConversation(activeConversation.id)
    } finally {
      setConversationActionLoading(false)
    }
  }

  const handleAddParticipant = async (candidate: ChatUserSummary) => {
    if (!activeConversation || activeConversation.type !== 'group') return
    try {
      setConversationActionLoading(true)
      await addConversationParticipants(Number(activeConversation.id), [candidate.id])
      resetConversationInfoSearch()
      await refreshConversation(activeConversation.id)
    } finally {
      setConversationActionLoading(false)
    }
  }

  const handleUpdateParticipantRole = async (participantId: string, role: 'admin' | 'member') => {
    if (!activeConversation || activeConversation.type !== 'group') return
    try {
      setConversationActionLoading(true)
      await updateConversationParticipant(Number(activeConversation.id), Number(participantId), { role })
      await refreshConversation(activeConversation.id)
    } finally {
      setConversationActionLoading(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!activeConversation) return
    try {
      setConversationActionLoading(true)
      await removeConversationParticipant(Number(activeConversation.id), Number(participantId))
      await refreshConversation(activeConversation.id)
      if (String(user?.id ?? '') === participantId) {
        setShowConversationInfo(false)
        setActiveConversation(null)
      }
    } finally {
      setConversationActionLoading(false)
    }
  }

  const getExpandedStyle = () => {
    const vertical = alignment.y === 'bottom' ? 'bottom-0 origin-bottom-' : 'top-0 origin-top-'
    const horizontal = alignment.x === 'right' ? 'right-0' : 'left-0'
    const origin = vertical + (alignment.x === 'right' ? 'right' : 'left')

    return {
      className: `absolute ${vertical.split(' ')[0]} ${horizontal} ${origin}`,
    }
  }

  const expandedStyle = getExpandedStyle()
  const reactionOptions = ['👍', '❤️', '😂', '😮', '🎉']
  const formatMessageTime = (value: Date) => (
    new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  )
  const hasUploadingAttachments = pendingAttachments.some((attachment) => attachment.status === 'uploading' || attachment.status === 'queued')
  const hasUploadedAttachments = pendingAttachments.some((attachment) => attachment.status === 'uploaded')

  const inferAttachmentKind = (mimeType: string): 'image' | 'video' | 'file' => (
    mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('video/')
        ? 'video'
        : 'file'
  )

  const getFileCardMeta = (fileName: string, mimeType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return { icon: FileText, label: t('chat_widget.file_pdf'), accent: 'text-red-500' }
    }
    if (['doc', 'docx'].includes(extension)) {
      return { icon: FileText, label: t('chat_widget.file_docx'), accent: 'text-blue-500' }
    }
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return { icon: FileSpreadsheet, label: t('chat_widget.file_sheet'), accent: 'text-emerald-500' }
    }
    if (['zip', 'rar', '7z'].includes(extension) || mimeType.includes('zip')) {
      return { icon: FileArchive, label: t('chat_widget.file_zip'), accent: 'text-amber-500' }
    }
    if (mimeType.startsWith('video/')) {
      return { icon: FileVideo, label: t('chat_widget.file_video'), accent: 'text-fuchsia-500' }
    }
    return { icon: FileCode2, label: extension.toUpperCase() || t('chat_widget.file_generic'), accent: 'text-slate-500' }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes <= 0) return t('chat_widget.file_size_mb', { size: '0.00' })
    return t('chat_widget.file_size_mb', { size: (bytes / 1024 / 1024).toFixed(2) })
  }

  const getAttachmentStatusLabel = (attachment: typeof pendingAttachments[number]) => {
    if (attachment.status === 'uploaded') return t('chat_widget.upload_complete')
    if (attachment.status === 'cancelled') return t('chat_widget.upload_cancelled')
    if (attachment.status === 'error') return attachment.error || t('chat_widget.upload_failed')
    if (attachment.status === 'queued') return t('chat_widget.upload_queued')
    return t('chat_widget.uploading_progress', { progress: attachment.progress })
  }

  if (!state.isOpen) {
    return null
  }

  return (
    <motion.div
      ref={containerRef}
      drag
      dragControls={dragControls}
      dragListener
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      className="fixed z-50 bottom-3 right-3 touch-none sm:bottom-6 sm:right-6"
      initial={false}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="expanded"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            width: 'min(96vw, 34rem)',
            height: 'min(78vh, 680px)',
            maxWidth: 'calc(100vw - 1rem)',
          }}
          className={`rounded-xl border bg-background/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10 ${expandedStyle.className} flex flex-col overflow-hidden`}
        >

            <div onPointerDown={(e) => dragControls.start(e)} className="cursor-grab select-none active:cursor-grabbing">
              <ChatWidgetHeader
                title={activeConversation ? t('chat_widget.messages_title') : t('chat_widget.support_chat')}
                subtitle={
                  activeConversation
                    ? (activeConversation.type === 'group' ? t('chat_widget.group_conversation') : t('chat_widget.chatting_now'))
                    : t('chat_widget.reply_immediately')
                }
                isTyping={isTyping}
                hasActiveConversation={Boolean(activeConversation)}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {state.activeConversationId && (
                      <>
                        <DropdownMenuItem onClick={() => setShowConversationInfo(true)}>
                          <Info className="w-4 h-4 mr-2" />
                          {t('chat_widget.conversation_info')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleBackToConversations}>
                          {t('chat_widget.close_conversation')}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={toggleChat}>
                      {t('chat_widget.minimize_chat')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                  onClick={toggleChat}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </ChatWidgetHeader>
            </div>


            <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-slate-50 to-white dark:from-gray-900/70 dark:to-gray-900">
              {!state.activeConversationId ? (

                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start rounded-xl border-dashed bg-white dark:bg-gray-800"
                      onClick={() => setShowCreateGroup(true)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {t('chat_widget.create_group')}
                    </Button>
                    {state.conversations.length === 0 ? (
                      <ChatEmptyState
                        title={t('chat.no_messages_yet')}
                        description={t('chat_widget.start_conversation')}
                      />
                    ) : (
                      state.conversations.map((conversation) => (
                        <ChatConversationCard
                          key={conversation.id}
                          id={conversation.id}
                          title={
                            conversation.type === 'group'
                              ? (conversation.title || t('chat_widget.group_chat'))
                              : (
                                  conversation.participants.find(
                                    (participant) => String(participant.id) !== String(user?.id ?? ''),
                                  )?.name || t('chat_widget.unknown')
                                )
                          }
                          preview={conversation.lastMessage?.content || t('chat.no_messages_yet')}
                          updatedAt={conversation.updatedAt}
                          unreadCount={conversation.unreadCount}
                          avatar={
                            conversation.type === 'group'
                              ? undefined
                              : conversation.participants.find(
                                  (participant) => String(participant.id) !== String(user?.id ?? ''),
                                )?.avatar
                          }
                          avatarFallback={
                            conversation.type === 'group'
                              ? (conversation.title || 'G').slice(0, 2).toUpperCase()
                              : (
                                  conversation.participants.find(
                                    (participant) => String(participant.id) !== String(user?.id ?? ''),
                                  )?.name?.charAt(0) || 'U'
                                )
                          }
                          onClick={() => setActiveConversation(conversation.id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              ) : (

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="shrink-0 border-b bg-white/90 px-3 py-2 backdrop-blur dark:bg-gray-800/90">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group -ml-1 h-8 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-700"
                      onClick={handleBackToConversations}
                    >
                      <span className="inline-block transition-transform group-hover:-translate-x-1">{'<'}</span> {t('chat_widget.back')}
                    </Button>
                  </div>

                  <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),transparent_35%)] p-3">
                    {messages.length === 0 ? (
                      <ChatEmptyState
                        title={t('chat_widget.start_chatting')}
                        description={t('chat_widget.reply_immediately')}
                      />
                    ) : (
                      <div className="space-y-3 pb-1">
                        {state.activeConversationId && state.messageMeta[state.activeConversationId]?.loadingOlder && (
                          <p className="py-1 text-center text-xs text-muted-foreground">{t('chat_widget.loading_older_messages')}</p>
                        )}
                        {messages.map((message) => {
                          const isMe = message.senderId === String(user?.id ?? '')
                          const isRevoked = message.status === 'revoked'
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={message.id}
                              className={`group flex w-full items-end ${isMe ? 'justify-end pl-10' : 'justify-start pr-10'}`}
                            >
                              {!isMe && (
                                <Avatar className="mr-1 h-7 w-7 shrink-0 shadow-sm ring-2 ring-white/80 dark:ring-slate-700/60">
                                  <AvatarImage src={message.senderAvatar} />
                                  <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`flex min-w-0 max-w-[90%] md:max-w-[86%] items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div
                                  className={`min-w-0 max-w-full overflow-hidden rounded-2xl px-3.5 py-2.5 text-[13px] shadow-sm ${
                                    isRevoked
                                      ? 'border border-dashed border-gray-300 bg-gray-100 text-gray-500 italic dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                      : isMe
                                        ? 'rounded-br-sm bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-1 ring-blue-300/40'
                                        : 'rounded-bl-sm border bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                  }`}
                                >
                                  {!isMe && activeConversation?.type === 'group' && !isRevoked && (
                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600/80 dark:text-blue-300/80">
                                      {message.senderName}
                                    </p>
                                  )}
                                  {message.replyTo && !isRevoked && (
                                    <div className={`mb-2 rounded-lg border px-2 py-1 text-[11px] ${
                                      isMe
                                        ? 'border-white/20 bg-white/10 text-blue-100'
                                        : 'border-gray-200 bg-gray-50 text-muted-foreground dark:border-gray-700 dark:bg-gray-900/60'
                                    }`}>
                                      <p className="font-medium">{message.replyTo.senderName}</p>
                                      <p className="truncate">{message.replyTo.content}</p>
                                    </div>
                                  )}
                                  {editingMessageId === message.id ? (
                                    <div className="space-y-2">
                                      <Input
                                        value={editingContent}
                                        onChange={(e) => setEditingContent(e.target.value)}
                                        className={`${isMe ? 'border-white/20 bg-white/10 text-white placeholder:text-blue-100' : ''}`}
                                      />
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          size="sm"
                                          variant={isMe ? 'secondary' : 'outline'}
                                          onClick={() => {
                                            setEditingMessageId(null)
                                            setEditingContent('')
                                          }}
                                        >
                                          {t('chat_widget.cancel')}
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            if (!state.activeConversationId || !editingContent.trim()) return
                                            void editMessage(state.activeConversationId, message.id, editingContent.trim())
                                            setEditingMessageId(null)
                                            setEditingContent('')
                                          }}
                                        >
                                          {t('chat_widget.save')}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className={`${isRevoked ? 'text-[12px]' : 'whitespace-pre-wrap break-all leading-relaxed [overflow-wrap:anywhere]'}`}>
                                      {isRevoked ? t('chat_widget.message_revoked') : message.content}
                                    </p>
                                  )}
                                  {message.attachments && message.attachments.length > 0 && !isRevoked && (
                                    <div className="mt-2 space-y-2">
                                      {message.attachments.map((attachment, index) => (
                                        <div key={`${message.id}-attachment-${index}`} className="overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                                          {attachment.kind === 'image' ? (
                                            <img src={attachment.fileUrl} alt={attachment.fileName} className="max-h-56 w-full object-cover" />
                                          ) : attachment.kind === 'video' ? (
                                            <video src={attachment.fileUrl} controls className="max-h-56 w-full bg-black" />
                                          ) : (
                                            (() => {
                                              const meta = getFileCardMeta(attachment.fileName, attachment.mimeType)
                                              const Icon = meta.icon
                                              return (
                                                <a
                                                  href={attachment.fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className={`flex items-center justify-between gap-3 p-3 text-sm ${isMe ? 'text-white' : 'text-foreground'}`}
                                                >
                                                  <div className="flex min-w-0 items-center gap-3">
                                                    <div className={`rounded-lg bg-white/70 p-2 dark:bg-black/20 ${meta.accent}`}>
                                                      <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                      <p className="truncate font-medium">{attachment.fileName}</p>
                                                      <p className={`text-xs ${isMe ? 'text-blue-100/80' : 'text-muted-foreground'}`}>{meta.label} · {attachment.mimeType}</p>
                                                    </div>
                                                  </div>
                                                  <Paperclip className="h-4 w-4 shrink-0" />
                                                </a>
                                              )
                                            })()
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {message.reactions && message.reactions.length > 0 && !isRevoked && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {message.reactions.map((reaction) => (
                                        <button
                                          key={`${message.id}-${reaction.emoji}`}
                                          type="button"
                                          onClick={() => state.activeConversationId && void toggleReaction(state.activeConversationId, message.id, reaction.emoji)}
                                          className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                            reaction.reactedByMe
                                              ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500 dark:bg-blue-900/40 dark:text-blue-200'
                                              : 'border-gray-200 bg-white/70 text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300'
                                          }`}
                                        >
                                          {reaction.emoji} {reaction.count}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <p className={`mt-1 text-[10px] ${isMe && !isRevoked ? 'text-blue-100/80' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {message.status === 'edited' ? `${t('chat_widget.edited')} · ` : ''}
                                    {formatMessageTime(message.timestamp)}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 self-center rounded-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isMe ? 'end' : 'start'}>
                                    <DropdownMenuItem onClick={() => setReplyingTo({ id: message.id, senderName: message.senderName, content: message.content })}>
                                      <Reply className="w-4 h-4 mr-2" />
                                      {t('chat_widget.reply')}
                                    </DropdownMenuItem>
                                    {reactionOptions.map((reaction) => (
                                      <DropdownMenuItem
                                        key={`${message.id}-${reaction}-option`}
                                        onClick={() => state.activeConversationId && void toggleReaction(state.activeConversationId, message.id, reaction)}
                                      >
                                        <Smile className="w-4 h-4 mr-2" />
                                        {reaction}
                                      </DropdownMenuItem>
                                    ))}
                                    {isMe && !isRevoked && (
                                      <DropdownMenuItem onClick={() => {
                                        setEditingMessageId(message.id)
                                        setEditingContent(message.content)
                                      }}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        {t('chat_widget.edit')}
                                      </DropdownMenuItem>
                                    )}
                                    {isMe && !isRevoked && (
                                      <DropdownMenuItem onClick={() => state.activeConversationId && void revokeMessage(state.activeConversationId, message.id)}>
                                        <Undo2 className="w-4 h-4 mr-2" />
                                        {t('chat_widget.revoke')}
                                      </DropdownMenuItem>
                                    )}
                                    {!isMe && !isRevoked && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          const reason = window.prompt(t('chat_widget.report_reason_prompt'), '')?.trim()
                                          if (!reason) return
                                          void reportConversationMessage(Number(message.id), { reason })
                                            .then(() => toast.success(t('chat_widget.report_sent')))
                                            .catch((err: any) => toast.error(err?.message || t('chat_widget.report_failed')))
                                        }}
                                      >
                                        <Flag className="w-4 h-4 mr-2" />
                                        {t('chat_widget.report')}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                          )
                        })}
                        {isTyping && <ChatTypingIndicator />}
                      </div>
                    )}
                  </ScrollArea>

                  <div
                    className="relative shrink-0 border-t bg-white/95 px-3 py-2 backdrop-blur dark:bg-gray-800/95"
                    onDrop={(event) => void handleAttachmentDrop(event)}
                    onDragOver={handleAttachmentDragOver}
                    onDragLeave={handleAttachmentDragLeave}
                  >
                    {isDragOverAttachments && (
                      <div className="absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/95 text-sm font-medium text-blue-700 dark:border-blue-500 dark:bg-blue-950/70 dark:text-blue-200">
                        {t('chat_widget.drop_files_here')}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={Array.from(ALLOWED_ATTACHMENT_MIME_TYPES).join(',')}
                      className="hidden"
                      onChange={handleAttachmentSelected}
                    />
                    {replyingTo && (
                      <div className="mb-2 flex items-start justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs dark:border-blue-800 dark:bg-blue-900/30">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{t('chat_widget.replying_to', { name: replyingTo.senderName })}</p>
                          <p className="truncate text-muted-foreground">{replyingTo.content}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {pendingAttachments.length > 0 && (
                      <div className="mb-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                          <span className="truncate">{t('chat_widget.pending_attachments', { current: pendingAttachments.length, max: MAX_ATTACHMENTS_PER_MESSAGE })}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={handleCancelAllPendingAttachments}>
                            {t('chat_widget.cancel_all')}
                          </Button>
                        </div>
                        <div className="-mx-1 overflow-x-auto px-1 pb-1">
                          <div className="flex gap-2">
                            {pendingAttachments.map((attachment) => {
                              const meta = getFileCardMeta(attachment.fileName, attachment.mimeType)
                              const Icon = meta.icon
                              const isVisualPreview = Boolean(attachment.previewUrl && (attachment.kind === 'image' || attachment.kind === 'video'))
                              return (
                                <div key={attachment.id} className="w-32 shrink-0 rounded-xl border bg-gray-50 p-2 dark:bg-gray-900">
                                  <div className="space-y-2">
                                    {attachment.kind === 'image' && attachment.previewUrl ? (
                                      <button type="button" className="block h-20 w-full overflow-hidden rounded-lg border bg-black/5 text-left dark:bg-black/30" onClick={() => setPreviewAttachmentId(attachment.id)}>
                                        <img src={attachment.previewUrl} alt={attachment.fileName} className="h-full w-full object-cover" />
                                      </button>
                                    ) : attachment.kind === 'video' && attachment.previewUrl ? (
                                      <button type="button" className="block h-20 w-full overflow-hidden rounded-lg border bg-black text-left" onClick={() => setPreviewAttachmentId(attachment.id)}>
                                        <video src={attachment.previewUrl} className="h-full w-full object-cover" />
                                      </button>
                                    ) : (
                                      <div className={`flex h-20 w-full items-center justify-center rounded-lg border bg-white dark:bg-black/20 ${meta.accent}`}>
                                        <Icon className="h-6 w-6" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-medium text-foreground">{attachment.fileName}</p>
                                      <p className="truncate text-[11px] text-muted-foreground">{meta.label} · {formatFileSize(attachment.fileSize)}</p>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                                      <div
                                        className={`h-full rounded-full transition-all ${attachment.status === 'error' ? 'bg-red-500' : attachment.status === 'cancelled' ? 'bg-amber-500' : attachment.status === 'uploaded' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                        style={{ width: `${attachment.status === 'error' || attachment.status === 'cancelled' ? 100 : attachment.progress}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate text-[11px] text-muted-foreground">{getAttachmentStatusLabel(attachment)}</span>
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        {attachment.canRetry && (attachment.status === 'error' || attachment.status === 'cancelled') && (
                                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => void handleRetryPendingAttachment(attachment.id)}>
                                            <RefreshCw className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                        {attachment.status === 'uploading' && (
                                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCancelPendingAttachment(attachment.id)}>
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemovePendingAttachment(attachment.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSendMessage()
                      }}
                      className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-2 dark:border-slate-700 dark:bg-slate-900/90"
                    >
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-slate-800" onClick={handlePickAttachment}>
                          <Paperclip className="w-5 h-5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-slate-800" onClick={handlePickAttachment}>
                          <ImageIcon className="w-5 h-5" />
                        </Button>
                      </div>

                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={t('chat.type_message')}
                        className="min-h-[44px] flex-1 rounded-full border border-slate-200 bg-white px-4 shadow-inner focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                      />

                      <div className="flex items-center gap-1">
                        <Button
                          type="submit"
                          size="icon"
                          disabled={(!messageInput.trim() && !hasUploadedAttachments) || hasUploadingAttachments}
                          className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md transition-all hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
            <Dialog
              open={showCreateGroup}
              onOpenChange={(open) => {
                setShowCreateGroup(open)
                if (!open) resetCreateGroupDialog()
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('chat_widget.create_group')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('chat_widget.group_name')}</label>
                    <Input
                      value={groupTitle}
                      onChange={(e) => setGroupTitle(e.target.value)}
                      placeholder={t('chat_widget.group_name_placeholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('chat_widget.search_users')}</label>
                    <Input
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder={t('chat_widget.search_users_placeholder')}
                    />
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border p-2">
                      {userSearchLoading ? (
                        <p className="text-sm text-muted-foreground">{t('chat_widget.searching')}</p>
                      ) : userSearchResults.length > 0 ? (
                        userSearchResults
                          .filter((candidate) => !selectedUsers.some((item) => item.id === candidate.id))
                          .map((candidate) => (
                            <button
                              key={candidate.id}
                              type="button"
                              onClick={() => handleAddSelectedUser(candidate)}
                              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={candidate.avatar || undefined} />
                                  <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{candidate.name}</p>
                                  <p className="text-xs text-muted-foreground">ID: {candidate.id}</p>
                                </div>
                              </div>
                              <UserPlus className="h-4 w-4 text-muted-foreground" />
                            </button>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {userSearchQuery.trim().length < 2 ? t('chat_widget.search_min_chars') : t('chat_widget.no_matching_users')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{t('chat_widget.selected_members')}</p>
                      <Badge variant="secondary">{selectedUsers.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedUsers.length > 0 ? selectedUsers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar || undefined} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {member.id}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSelectedUser(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground">{t('chat_widget.select_at_least_two')}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    disabled={conversationActionLoading || !groupTitle.trim() || selectedUsers.length < 2}
                    onClick={() => void handleCreateGroup()}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {t('chat_widget.create_group')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showConversationInfo}
              onOpenChange={(open) => {
                setShowConversationInfo(open)
                if (!open) resetConversationInfoSearch()
              }}
            >
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{t('chat_widget.conversation_info')}</DialogTitle>
                </DialogHeader>
                {activeConversation ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-900/60 dark:from-blue-950/50 dark:to-indigo-950/30">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={activeConversation.type === 'group' ? undefined : otherParticipant?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                          {conversationAvatarLabel}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">{conversationDisplayName}</p>
                        <p className="text-sm text-muted-foreground">{conversationSubtitle}</p>
                      </div>
                    </div>

                    {activeConversation.type === 'group' ? (
                      <>
                        <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                          <label className="text-sm font-medium text-foreground">{t('chat_widget.group_name')}</label>
                          <div className="flex gap-2">
                            <Input
                              value={conversationTitle}
                              onChange={(e) => setConversationTitle(e.target.value)}
                              placeholder={t('chat_widget.group_name_placeholder')}
                            />
                            <Button
                              type="button"
                              onClick={() => void handleSaveConversationInfo()}
                              disabled={conversationActionLoading || !conversationTitle.trim()}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {t('chat_widget.save')}
                            </Button>
                          </div>
                        </div>

                        {canManageParticipants && (
                          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                            <label className="text-sm font-medium text-foreground">{t('chat_widget.add_members')}</label>
                            <Input
                              value={infoUserSearchQuery}
                              onChange={(e) => setInfoUserSearchQuery(e.target.value)}
                              placeholder={t('chat_widget.search_users_placeholder')}
                            />
                            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border bg-background p-2">
                              {infoUserSearchLoading ? (
                                <p className="text-sm text-muted-foreground">{t('chat_widget.searching')}</p>
                              ) : infoUserSearchResults.length > 0 ? (
                                infoUserSearchResults.map((candidate) => (
                                  <button
                                    key={candidate.id}
                                    type="button"
                                    onClick={() => void handleAddParticipant(candidate)}
                                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={candidate.avatar || undefined} />
                                        <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">{candidate.name}</p>
                                        <p className="text-xs text-muted-foreground">ID: {candidate.id}</p>
                                      </div>
                                    </div>
                                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {infoUserSearchQuery.trim().length < 2 ? t('chat_widget.search_min_chars') : t('chat_widget.no_matching_users')}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}

                    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">{t('chat_widget.members')}</p>
                        </div>
                        <Badge variant="secondary">{activeParticipants.length}</Badge>
                      </div>

                      <div className="space-y-2">
                        {activeParticipants.map((participant) => {
                          const isCurrentUser = String(participant.id) === String(user?.id ?? '')
                          return (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={participant.avatar} />
                                  <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{participant.name}</p>
                                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span>{isCurrentUser ? t('chat_widget.you') : activeConversation.type === 'group' ? t('chat_widget.member') : t('chat_widget.user')}</span>
                                    {participant.role ? (
                                      <Badge
                                        variant="outline"
                                        className={`h-5 px-1.5 text-[10px] ${
                                          participant.role === 'owner'
                                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                                            : participant.role === 'admin'
                                              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                                              : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200'
                                        }`}
                                      >
                                        {participant.role}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {activeConversation.type === 'group' && (
                                <div className="flex items-center gap-2">
                                  {!isCurrentUser && canChangeRoles && participant.role !== 'owner' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={conversationActionLoading}
                                      onClick={() => void handleUpdateParticipantRole(
                                        participant.id,
                                        participant.role === 'admin' ? 'member' : 'admin',
                                      )}
                                    >
                                      {participant.role === 'admin' ? t('chat_widget.demote_admin') : t('chat_widget.promote_admin')}
                                    </Button>
                                  )}
                                  {(isCurrentUser || canManageParticipants) && (
                                    <Button
                                      type="button"
                                      variant={isCurrentUser ? 'outline' : 'destructive'}
                                      size="sm"
                                      disabled={conversationActionLoading || (!isCurrentUser && participant.role === 'owner')}
                                      onClick={() => void handleRemoveParticipant(participant.id)}
                                    >
                                      {isCurrentUser ? (
                                        <>
                                          <LogOut className="w-4 h-4 mr-2" />
                                          {t('chat_widget.leave_group')}
                                        </>
                                      ) : (
                                        <>
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          {t('chat_widget.delete')}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
            <Dialog open={Boolean(previewAttachment)} onOpenChange={(open) => { if (!open) setPreviewAttachmentId(null) }}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{previewAttachment?.fileName || t('chat_widget.attachment_preview')}</DialogTitle>
                </DialogHeader>
                {previewAttachment ? (
                  <div className="overflow-hidden rounded-xl border bg-black/5 dark:bg-black/40">
                    {previewAttachment.kind === 'image' && previewAttachment.previewUrl ? (
                      <img src={previewAttachment.previewUrl} alt={previewAttachment.fileName} className="max-h-[75vh] w-full object-contain" />
                    ) : previewAttachment.kind === 'video' && previewAttachment.previewUrl ? (
                      <video src={previewAttachment.previewUrl} controls autoPlay className="max-h-[75vh] w-full bg-black" />
                    ) : (
                      <div className="p-6 text-sm text-muted-foreground">{t('chat_widget.no_large_preview')}</div>
                    )}
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
