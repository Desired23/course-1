import * as React from "react"
import { Tooltip as AntTooltip } from "antd"
import { cn } from "./utils"

const HoverCardContext = React.createContext<{
  title: React.ReactNode
  setTitle: (t: React.ReactNode) => void
  openDelay?: number
  closeDelay?: number
} | null>(null)

function HoverCard({ children, openDelay, closeDelay }: {
  children?: React.ReactNode
  openDelay?: number
  closeDelay?: number
}) {
  const [title, setTitle] = React.useState<React.ReactNode>(null)
  return (
    <HoverCardContext.Provider value={{ title, setTitle, openDelay, closeDelay }}>
      {children}
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

function HoverCardContent({ children, className, align: _align, sideOffset: _s }: {
  children?: React.ReactNode
  className?: string
  align?: string
  sideOffset?: number
}) {
  const ctx = React.useContext(HoverCardContext)
  React.useEffect(() => {
    ctx?.setTitle(
      <div className={cn("bg-popover text-popover-foreground rounded-md border p-4 shadow-md w-80", className)}>
        {children}
      </div>
    )
  })
  return null
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
