import { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { cn } from './ui/utils'

interface SidebarItemWithTooltipProps {
  label: string
  icon: ReactNode
  isCollapsed: boolean
  isActive?: boolean
  onClick?: () => void
  className?: string
  badge?: number
  children?: ReactNode
}

export function SidebarItemWithTooltip({
  label,
  icon,
  isCollapsed,
  isActive = false,
  onClick,
  className,
  badge,
  children
}: SidebarItemWithTooltipProps) {
  const content = children || (
    <button
      className={cn(
        'w-full px-4 py-2.5 text-left hover:bg-gray-800 transition-colors flex items-center gap-3',
        isActive && 'bg-gray-800',
        isCollapsed && 'md:px-2 md:justify-center',
        className
      )}
      onClick={onClick}
    >
      <span className={cn(
        'flex items-center gap-3',
        isCollapsed && 'md:justify-center'
      )}>
        {icon}
        {!isCollapsed && <span className="text-sm">{label}</span>}
        {!isCollapsed && badge && (
          <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </span>
    </button>
  )

  if (!isCollapsed) {
    return <>{content}</>
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="right" className="hidden md:block">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
