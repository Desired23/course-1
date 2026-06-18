import * as React from "react"
import { Tooltip as AntTooltip } from "antd"
import { cn } from "./utils"

const HoverCardContext = React.createContext<{
  title: React.ReactNode
  openDelay?: number
  closeDelay?: number
} | null>(null)

interface HoverCardContentProps {
  children?: React.ReactNode
  className?: string
  align?: string
  sideOffset?: number
}

function renderHoverCardContent({ children, className }: HoverCardContentProps) {
  return (
    <div className={cn("bg-popover text-popover-foreground rounded-md border p-4 shadow-md w-80", className)}>
      {children}
    </div>
  )
}

function HoverCard({ children, openDelay, closeDelay }: {
  children?: React.ReactNode
  openDelay?: number
  closeDelay?: number
}) {
  const childArray = React.Children.toArray(children)
  const contentElement = childArray.find(
    (child): child is React.ReactElement<HoverCardContentProps> =>
      React.isValidElement(child) && child.type === HoverCardContent
  )
  const title = contentElement ? renderHoverCardContent(contentElement.props) : null
  const contextValue = React.useMemo(
    () => ({ title, openDelay, closeDelay }),
    [title, openDelay, closeDelay]
  )

  return (
    <HoverCardContext.Provider value={contextValue}>
      {childArray.map(child =>
        React.isValidElement(child) && child.type === HoverCardContent ? null : child
      )}
    </HoverCardContext.Provider>
  )
}

function HoverCardTrigger({ children, asChild: _a }: { children?: React.ReactNode; asChild?: boolean }) {
  const ctx = React.useContext(HoverCardContext)
  const child = React.Children.only(children) as React.ReactElement<any>
  return (
    <AntTooltip
      title={ctx?.title}
      mouseEnterDelay={(ctx?.openDelay ?? 0) / 1000}
      mouseLeaveDelay={(ctx?.closeDelay ?? 100) / 1000}
      overlayInnerStyle={{ padding: 0, background: 'transparent', boxShadow: 'none' }}
    >
      {child}
    </AntTooltip>
  )
}

function HoverCardContent({ align: _align, sideOffset: _s }: HoverCardContentProps) {
  return null
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
