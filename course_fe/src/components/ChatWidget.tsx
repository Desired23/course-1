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

  // Auto-scroll to bottom of messages
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
    ? (activeConversation.title || 'Nhom chat')
    : (otherParticipant?.name || t('chat_widget.unknown'))
  const conversationSubtitle = activeConversation?.type === 'group'
    ? `${activeParticipants.length} thanh vien`
    : (isTyping ? t('chat_widget.typing') : (otherParticipant?.name || t('chat_widget.unknown')))
  const conversationAvatarLabel = activeConversation?.type === 'group'
    ? (conversationDisplayName || 'G').slice(0, 2).toUpperCase()
    : (otherParticipant?.name?.charAt(0) || 'U')

  // Get messages for the active conversation from the dictionary
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
          fileName: 'Gioi han tep dinh kem',
          mimeType: 'text/plain',
          fileSize: 0,
          status: 'error',
          progress: 0,
          error: `Chi duoc gui toi da ${MAX_ATTACHMENTS_PER_MESSAGE} tep moi lan`,
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
            error: 'Loai tep khong duoc ho tro',
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
            error: 'Tep vuot qua gioi han 25MB',
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
                ? 'Da huy upload'
                : (error instanceof Error ? error.message : 'Upload that bai'),
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
  const reactionOptions = ['??', '??', '??', '??', '??']
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
      return { icon: FileText, label: 'PDF', accent: 'text-red-500' }
    }
    if (['doc', 'docx'].includes(extension)) {
      return { icon: FileText, label: 'DOCX', accent: 'text-blue-500' }
    }
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return { icon: FileSpreadsheet, label: 'Sheet', accent: 'text-emerald-500' }
    }
    if (['zip', 'rar', '7z'].includes(extension) || mimeType.includes('zip')) {
      return { icon: FileArchive, label: 'ZIP', accent: 'text-amber-500' }
    }
    if (mimeType.startsWith('video/')) {
      return { icon: FileVideo, label: 'Video', accent: 'text-fuchsia-500' }
    }
    return { icon: FileCode2, label: extension.toUpperCase() || 'FILE', accent: 'text-slate-500' }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes <= 0) return '0 MB'
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const getAttachmentStatusLabel = (attachment: typeof pendingAttachments[number]) => {
    if (attachment.status === 'uploaded') return 'Da upload xong'
    if (attachment.status === 'cancelled') return 'Da huy upload'
    if (attachment.status === 'error') return attachment.error || 'Upload that bai'
    if (attachment.status === 'queued') return 'Dang cho upload...'
    return `Dang upload... ${attachment.progress}%`
  }

  return (
    <motion.div
      ref={containerRef}
      drag
      dragControls={dragControls}
      dragListener={!state.isOpen}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      className="fixed z-50 bottom-6 right-6 touch-none"
      initial={false}
    >
      <AnimatePresence mode="wait">
        {!state.isOpen ? (
          <motion.div
            key="collapsed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            className="relative"
          >
            <Button
              size="icon"
              className="w-16 h-16 rounded-full shadow-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-2 border-white dark:border-gray-800"
              onClick={handleToggle}
            >
              <MessageCircle className="w-8 h-8 text-white" />
              {state.totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white border-2 border-white dark:border-gray-900 animate-in zoom-in">
                  {state.totalUnreadCount}
                </span>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-[350px] md:w-[400px] h-[600px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/10 ${expandedStyle.className}`}
          >
            {/* Header - Draggable Area */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {activeConversation ? 'Tin nhan' : t('chat_widget.support_chat')}
                  </h3>
                  {activeConversation ? (
                    <p className="text-xs text-blue-100 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-white animate-pulse' : 'bg-green-400'}`} />
                      {activeConversation.type === 'group' ? 'Hoi thoai nhom' : 'Dang tro chuyen'}
                    </p>
                  ) : (
                    <p className="text-xs text-blue-100">
                      {t('chat_widget.reply_immediately')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
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
                          Thong tin hoi thoai
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
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/50">
              {!state.activeConversationId ? (
                // Conversation List
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start rounded-xl border-dashed bg-white dark:bg-gray-800"
                      onClick={() => setShowCreateGroup(true)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Tao nhom chat
                    </Button>
                    {state.conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{t('chat.no_messages_yet')}</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                          {t('chat_widget.start_conversation')}
                        </p>
                      </div>
                    ) : (
                      state.conversations.map((conversation) => (
                        <motion.button
                          key={conversation.id}
                          layoutId={`conversation-${conversation.id}`}
                          className="w-full p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all text-left group"
                          onClick={() => setActiveConversation(conversation.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm">
                                <AvatarImage
                                  src={
                                    conversation.type === 'group'
                                      ? undefined
                                      : conversation.participants.find(
                                          (participant) => String(participant.id) !== String(user?.id ?? ''),
                                        )?.avatar
                                  }
                                />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                  {conversation.type === 'group'
                                    ? (conversation.title || 'G').slice(0, 2).toUpperCase()
                                    : (
                                        conversation.participants.find(
                                          (participant) => String(participant.id) !== String(user?.id ?? ''),
                                        )?.name?.charAt(0) || 'U'
                                      )}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                                  {conversation.type === 'group'
                                    ? (conversation.title || 'Group chat')
                                    : (
                                        conversation.participants.find(
                                          (participant) => String(participant.id) !== String(user?.id ?? ''),
                                        )?.name || t('chat_widget.unknown')
                                      )}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate font-medium">
                                {conversation.lastMessage?.content || t('chat.no_messages_yet')}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              ) : (
                // Active Chat
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="shrink-0 border-b bg-white px-3 py-2 dark:bg-gray-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-1 h-8 px-2 text-xs text-muted-foreground hover:text-foreground group"
                      onClick={handleBackToConversations}
                    >
                      <span className="inline-block transition-transform group-hover:-translate-x-1">{'<'}</span> Quay lai
                    </Button>
                  </div>

                  <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 overflow-hidden p-3">
                    {messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center space-y-2 opacity-50">
                        <MessageCircle className="w-8 h-8" />
                        <p className="text-sm">{t('chat_widget.start_chatting')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 pb-1">
                        {state.activeConversationId && state.messageMeta[state.activeConversationId]?.loadingOlder && (
                          <p className="py-1 text-center text-xs text-muted-foreground">Dang tai tin nhan cu...</p>
                        )}
                        {messages.map((message) => {
                          const isMe = message.senderId === String(user?.id ?? '')
                          const isRevoked = message.status === 'revoked'
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={message.id}
                              className={`group flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isMe && (
                                <Avatar className="h-7 w-7 shrink-0 shadow-sm">
                                  <AvatarImage src={message.senderAvatar} />
                                  <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`flex min-w-0 max-w-[78%] items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div
                                  className={`min-w-0 max-w-full overflow-hidden rounded-2xl px-3.5 py-2 text-[13px] shadow-sm ${
                                    isRevoked
                                      ? 'border border-dashed border-gray-300 bg-gray-100 text-gray-500 italic dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                      : isMe
                                        ? 'rounded-br-sm bg-blue-600 text-white'
                                        : 'rounded-bl-sm border bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                  }`}
                                >
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
                                          Huy
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
                                          Luu
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className={`${isRevoked ? 'text-[12px]' : 'whitespace-pre-wrap break-all leading-relaxed [overflow-wrap:anywhere]'}`}>
                                      {isRevoked ? 'Tin nhan da duoc thu hoi' : message.content}
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
                                                      <p className={`text-xs ${isMe ? 'text-blue-100/80' : 'text-muted-foreground'}`}>{meta.label} ? {attachment.mimeType}</p>
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
                                    {message.status === 'edited' ? 'Da sua ? ' : ''}
                                    {formatMessageTime(message.timestamp)}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isMe ? 'end' : 'start'}>
                                    <DropdownMenuItem onClick={() => setReplyingTo({ id: message.id, senderName: message.senderName, content: message.content })}>
                                      <Reply className="w-4 h-4 mr-2" />
                                      Tra loi
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
                                        Chinh sua
                                      </DropdownMenuItem>
                                    )}
                                    {isMe && !isRevoked && (
                                      <DropdownMenuItem onClick={() => state.activeConversationId && void revokeMessage(state.activeConversationId, message.id)}>
                                        <Undo2 className="w-4 h-4 mr-2" />
                                        Thu hoi
                                      </DropdownMenuItem>
                                    )}
                                    {!isMe && !isRevoked && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          const reason = window.prompt('Ly do bao cao tin nhan:', '')?.trim()
                                          if (!reason) return
                                          void reportConversationMessage(Number(message.id), { reason })
                                            .then(() => toast.success('Da gui bao cao tin nhan'))
                                            .catch((err: any) => toast.error(err?.message || 'Khong the bao cao tin nhan'))
                                        }}
                                      >
                                        <Flag className="w-4 h-4 mr-2" />
                                        Report
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                          )
                        })}
                        {isTyping && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2"
                          >
                            <Avatar className="mt-1 h-8 w-8">
                              <AvatarFallback>...</AvatarFallback>
                            </Avatar>
                            <div className="rounded-2xl rounded-tl-sm border bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
                              <div className="flex gap-1">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"></span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  <div
                    className="relative shrink-0 border-t bg-white p-3 dark:bg-gray-800"
                    onDrop={(event) => void handleAttachmentDrop(event)}
                    onDragOver={handleAttachmentDragOver}
                    onDragLeave={handleAttachmentDragLeave}
                  >
                    {isDragOverAttachments && (
                      <div className="absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/95 text-sm font-medium text-blue-700 dark:border-blue-500 dark:bg-blue-950/70 dark:text-blue-200">
                        Tha file vao day de tai len
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
                      <div className="mb-2 flex items-start justify-between rounded-lg border bg-gray-50 px-3 py-2 text-xs dark:bg-gray-900">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">Dang tra loi {replyingTo.senderName}</p>
                          <p className="truncate text-muted-foreground">{replyingTo.content}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {pendingAttachments.length > 0 && (
                      <div className="mb-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                          <span className="truncate">{pendingAttachments.length}/{MAX_ATTACHMENTS_PER_MESSAGE} tep dang cho</span>
                          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={handleCancelAllPendingAttachments}>
                            Huy tat ca
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
                                      <p className="truncate text-[11px] text-muted-foreground">{meta.label} ? {formatFileSize(attachment.fileSize)}</p>
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
                      className="flex gap-2"
                    >
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground" onClick={handlePickAttachment}>
                          <Paperclip className="w-5 h-5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground" onClick={handlePickAttachment}>
                          <ImageIcon className="w-5 h-5" />
                        </Button>
                      </div>

                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={t('chat.type_message')}
                        className="min-h-[44px] flex-1 rounded-xl border-0 bg-gray-50 px-4 focus-visible:ring-1 focus-visible:ring-blue-500 dark:bg-gray-900"
                      />

                      <div className="flex items-center gap-1">
                        <Button
                          type="submit"
                          size="icon"
                          disabled={(!messageInput.trim() && !hasUploadedAttachments) || hasUploadingAttachments}
                          className="h-11 w-11 shrink-0 rounded-xl bg-blue-600 shadow-sm transition-colors hover:bg-blue-700"
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
                  <DialogTitle>Tao nhom chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ten nhom</label>
                    <Input
                      value={groupTitle}
                      onChange={(e) => setGroupTitle(e.target.value)}
                      placeholder="Nhap ten nhom"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tim nguoi dung</label>
                    <Input
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Nhap ten, username hoac email"
                    />
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border p-2">
                      {userSearchLoading ? (
                        <p className="text-sm text-muted-foreground">Dang tim...</p>
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
                          {userSearchQuery.trim().length < 2 ? 'Nhap it nhat 2 ky tu de tim' : 'Khong tim thay nguoi dung phu hop'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Thanh vien da chon</p>
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
                        <p className="text-sm text-muted-foreground">Chon it nhat 2 nguoi de tao nhom.</p>
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
                    Tao nhom
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
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Thong tin hoi thoai</DialogTitle>
                </DialogHeader>
                {activeConversation ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={activeConversation.type === 'group' ? undefined : otherParticipant?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                          {conversationAvatarLabel}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{conversationDisplayName}</p>
                        <p className="text-sm text-muted-foreground">{conversationSubtitle}</p>
                      </div>
                    </div>

                    {activeConversation.type === 'group' ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Ten nhom</label>
                          <div className="flex gap-2">
                            <Input
                              value={conversationTitle}
                              onChange={(e) => setConversationTitle(e.target.value)}
                              placeholder="Nhap ten nhom"
                            />
                            <Button
                              type="button"
                              onClick={() => void handleSaveConversationInfo()}
                              disabled={conversationActionLoading || !conversationTitle.trim()}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Luu
                            </Button>
                          </div>
                        </div>

                        {canManageParticipants && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Them thanh vien</label>
                            <Input
                              value={infoUserSearchQuery}
                              onChange={(e) => setInfoUserSearchQuery(e.target.value)}
                              placeholder="Nhap ten, username hoac email"
                            />
                            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border p-2">
                              {infoUserSearchLoading ? (
                                <p className="text-sm text-muted-foreground">Dang tim...</p>
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
                                  {infoUserSearchQuery.trim().length < 2 ? 'Nhap it nhat 2 ky tu de tim' : 'Khong tim thay nguoi dung phu hop'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">Thanh vien</p>
                        </div>
                        <Badge variant="secondary">{activeParticipants.length}</Badge>
                      </div>

                      <div className="space-y-2">
                        {activeParticipants.map((participant) => {
                          const isCurrentUser = String(participant.id) === String(user?.id ?? '')
                          return (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={participant.avatar} />
                                  <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{participant.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {isCurrentUser ? 'Ban' : activeConversation.type === 'group' ? 'Thanh vien' : 'Nguoi dung'}
                                    {participant.role ? ` ? ${participant.role}` : ''}
                                  </p>
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
                                      {participant.role === 'admin' ? 'Ha admin' : 'Len admin'}
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
                                          Roi nhom
                                        </>
                                      ) : (
                                        <>
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Xoa
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
                  <DialogTitle>{previewAttachment?.fileName || 'Preview tep dinh kem'}</DialogTitle>
                </DialogHeader>
                {previewAttachment ? (
                  <div className="overflow-hidden rounded-xl border bg-black/5 dark:bg-black/40">
                    {previewAttachment.kind === 'image' && previewAttachment.previewUrl ? (
                      <img src={previewAttachment.previewUrl} alt={previewAttachment.fileName} className="max-h-[75vh] w-full object-contain" />
                    ) : previewAttachment.kind === 'video' && previewAttachment.previewUrl ? (
                      <video src={previewAttachment.previewUrl} controls autoPlay className="max-h-[75vh] w-full bg-black" />
                    ) : (
                      <div className="p-6 text-sm text-muted-foreground">Khong co preview lon cho tep nay.</div>
                    )}
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
