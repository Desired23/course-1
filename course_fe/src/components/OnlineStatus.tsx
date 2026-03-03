import React from 'react'
import { cn } from './ui/utils'

interface OnlineStatusProps {
  isOnline?: boolean
  lastSeen?: Date
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function OnlineStatus({ 
  isOnline = false, 
  lastSeen, 
  size = 'md', 
  showText = false,
  className 
}: OnlineStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const getLastSeenText = () => {
    if (isOnline) return 'Online'
    if (!lastSeen) return 'Offline'
    
    const now = new Date()
    const diff = now.getTime() - new Date(lastSeen).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return 'Long time ago'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div
          className={cn(
            'rounded-full',
            sizeClasses[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
        {isOnline && (
          <div
            className={cn(
              'absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75',
              sizeClasses[size]
            )}
          />
        )}
      </div>
      {showText && (
        <span className={cn(
          'text-sm',
          isOnline ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
        )}>
          {getLastSeenText()}
        </span>
      )}
    </div>
  )
}
