import { MessageCircle, X, Send, Minus, GripHorizontal, Paperclip, Smile, Image as ImageIcon, MoreVertical } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useDragControls } from 'motion/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function ChatWidget() {
  const { state, toggleChat, sendMessage, receiveMessage, setActiveConversation } = useChat()
  const [messageInput, setMessageInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [alignment, setAlignment] = useState({ x: 'right', y: 'bottom' })
  const [isTyping, setIsTyping] = useState(false)
  
  const dragControls = useDragControls()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [state.messages, state.activeConversationId, isTyping])

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

  // Get messages for the active conversation from the dictionary
  const messages = state.activeConversationId ? state.messages[state.activeConversationId] || [] : []

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !state.activeConversationId || !activeConversation) return

    const conversationId = state.activeConversationId
    const text = messageInput.trim()
    
    // 1. Send user message
    sendMessage(conversationId, {
      senderId: 'current-user',
      senderName: 'You',
      content: text,
      type: 'text'
    })
    
    setMessageInput('')

    // 2. Simulate bot/user typing and reply
    setIsTyping(true)
    
    // Determine who we are talking to
    const otherParticipant = activeConversation.participants.find(p => p.id !== 'current-user')
    
    setTimeout(() => {
      setIsTyping(false)
      
      if (otherParticipant) {
        receiveMessage(conversationId, {
          id: Date.now().toString(),
          senderId: otherParticipant.id,
          senderName: otherParticipant.name,
          senderAvatar: otherParticipant.avatar,
          content: `This is a simulated reply from ${otherParticipant.name} to: "${text}"`,
          timestamp: new Date(),
          read: false,
          type: 'text'
        })
      }
    }, 2000)
  }

  const handleBackToConversations = () => {
    setActiveConversation(null)
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
                  <h3 className="font-bold text-sm">Support Chat</h3>
                  {activeConversation ? (
                    <p className="text-xs text-blue-100 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-white animate-pulse' : 'bg-green-400'}`} />
                      {isTyping ? 'Typing...' : activeConversation.participants.map(p => p.name).join(', ')}
                    </p>
                  ) : (
                    <p className="text-xs text-blue-100">
                      We reply immediately
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
                    <DropdownMenuItem onClick={handleBackToConversations}>
                      Close Conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleChat}>
                      Minimize Chat
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
                    {state.conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">No messages yet</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                          Start a conversation with our support team or instructors.
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
                                <AvatarImage src={conversation.participants[0]?.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                  {conversation.participants[0]?.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                                  {conversation.participants.map(p => p.name).join(', ')}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate font-medium">
                                {conversation.lastMessage?.content || "No messages yet"}
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
                <>
                  <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="-ml-2 h-8 text-xs text-muted-foreground hover:text-foreground group"
                      onClick={handleBackToConversations}
                    >
                      <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span> Back
                    </Button>
                  </div>
                  
                  <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-2 opacity-50">
                        <MessageCircle className="w-8 h-8" />
                        <p className="text-sm">Start chatting now</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isMe = message.senderId === 'current-user';
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={message.id}
                              className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                            >
                              {!isMe && (
                                <Avatar className="h-8 w-8 mt-1 shadow-sm">
                                  <AvatarImage src={message.senderAvatar} />
                                  <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                  isMe
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-white dark:bg-gray-800 border text-gray-800 dark:text-gray-200 rounded-tl-sm'
                                }`}
                              >
                                <p>{message.content}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                        {isTyping && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2"
                          >
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback>...</AvatarFallback>
                            </Avatar>
                            <div className="bg-white dark:bg-gray-800 border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-3 bg-white dark:bg-gray-800 border-t">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <div className="flex gap-1 items-center">
                         <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full">
                           <Paperclip className="w-5 h-5" />
                         </Button>
                         <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full">
                           <ImageIcon className="w-5 h-5" />
                         </Button>
                      </div>
                      
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 min-h-[44px] bg-gray-50 dark:bg-gray-900 border-0 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl px-4"
                      />
                      
                      <div className="flex gap-1 items-center">
                        <Button 
                          type="submit" 
                          size="icon" 
                          disabled={!messageInput.trim()}
                          className="h-11 w-11 rounded-xl shrink-0 bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}