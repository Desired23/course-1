import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X, HelpCircle, MessageCircle, Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useChat } from '../contexts/ChatContext'
import { useRouter } from './Router'

export function MobileFloatingButton() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { toggleChat, state: chatState } = useChat()
  const { navigate } = useRouter()

  const handleChatClick = () => {
    toggleChat()
    setIsExpanded(false)
  }

  const handleHelpClick = () => {
    navigate('/support')
    setIsExpanded(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3"
          >
            {/* Help Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleHelpClick}
              className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700"
            >
              <HelpCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </motion.button>

            {/* Chat Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleChatClick}
              className="relative w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700"
            >
              <MessageCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              {chatState.totalUnreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  {chatState.totalUnreadCount}
                </Badge>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge - shown when has unread messages and not expanded */}
        {!isExpanded && chatState.totalUnreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-6 h-6 p-0 flex items-center justify-center text-xs bg-red-500 border-2 border-white dark:border-gray-900">
            {chatState.totalUnreadCount > 99 ? '99+' : chatState.totalUnreadCount}
          </Badge>
        )}
      </motion.button>
    </div>
  )
}
