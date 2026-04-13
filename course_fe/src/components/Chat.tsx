import { useState, useRef, useEffect } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { MessageCircle, Send, X, Search, Phone, Video, MoreVertical, Paperclip, Smile } from 'lucide-react'
import { useChat } from "../contexts/ChatContext"
import { useAuth } from "../contexts/AuthContext"
import { useTranslation } from 'react-i18next'

export function Chat() {
  const { t } = useTranslation()
  const { state, toggleChat, closeChat, setActiveConversation, sendMessage, markConversationAsRead } = useChat()
  const { user } = useAuth()
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [state.messages, state.activeConversationId])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageInput.trim() && state.activeConversationId && user) {
      sendMessage(state.activeConversationId, {
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        content: messageInput.trim(),
        type: 'text'
      })
      setMessageInput('')
    }
  }

  const handleConversationClick = (conversationId: string) => {
    setActiveConversation(conversationId)
    markConversationAsRead(conversationId)
  }

  const filteredConversations = state.conversations.filter(conv => {
    if (!searchQuery) return true
    const otherParticipant = conv.participants.find(p => p.id !== user?.id)
    return otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const activeConversation = state.conversations.find(c => c.id === state.activeConversationId)
  const activeMessages = state.activeConversationId ? state.messages[state.activeConversationId] || [] : []
  const otherParticipant = activeConversation?.participants.find(p => p.id !== user?.id)

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('chat.just_now')
    if (minutes < 60) return t('chat.minutes_ago', { count: minutes })
    if (hours < 24) return t('chat.hours_ago', { count: hours })
    return t('chat.days_ago', { count: days })
  }

  if (!state.isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-background border rounded-lg shadow-lg z-50 flex flex-col">

      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{t('chat.messages')}</span>
          {state.totalUnreadCount > 0 && (
            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-xs">
              {state.totalUnreadCount}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={closeChat}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {!state.activeConversationId && (
          <div className="flex-1 flex flex-col">

            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('chat.search_conversations')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
            </div>


            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation) => {
                  const otherUser = conversation.participants.find(p => p.id !== user?.id)
                  if (!otherUser) return null

                  return (
                    <div
                      key={conversation.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleConversationClick(conversation.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherUser.avatar} />
                          <AvatarFallback>{otherUser.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        {otherUser.online && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{otherUser.name}</p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage?.content || t('chat.no_messages_yet')}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-4 w-4 rounded-full p-0 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )}


        {state.activeConversationId && activeConversation && (
          <div className="flex-1 flex flex-col">

            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveConversation(null)}
                  className="p-1"
                >
                  ←
                </Button>
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={otherParticipant?.avatar} />
                    <AvatarFallback>{otherParticipant?.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  {otherParticipant?.online && (
                    <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-green-500 border border-background rounded-full" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{otherParticipant?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {otherParticipant?.online
                      ? t('chat.online')
                      : otherParticipant?.lastSeen
                        ? t('chat.last_seen', { time: formatLastSeen(otherParticipant.lastSeen) })
                        : t('chat.offline')
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>


            <ScrollArea className="flex-1 p-3">
              <div className="space-y-4">
                {activeMessages.map((message) => {
                  const isOwn = message.senderId === user?.id

                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isOwn && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={message.senderAvatar} />
                            <AvatarFallback>{message.senderName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                        )}

                        <div className={`rounded-lg p-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>


            <div className="p-3 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder={t('chat.type_message')}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
