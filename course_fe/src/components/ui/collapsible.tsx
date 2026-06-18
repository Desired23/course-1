import * as React from "react"
import { cn } from "./utils"

const CollapsibleContext = React.createContext<{
  open: boolean
  onOpenChange?: (open: boolean) => void
} | null>(null)

function Collapsible({
  open,
  onOpenChange,
  defaultOpen = false,
  children,
  className,
  ...props
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  className?: string
  [key: string]: any
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open! : uncontrolled

  const handleChange = (next: boolean) => {
    if (!isControlled) setUncontrolled(next)
    onOpenChange?.(next)
  }

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: handleChange }}>
      <div data-state={isOpen ? "open" : "closed"} className={cn(className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(CollapsibleContext)
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => ctx?.onOpenChange?.(!ctx.open)}
      data-state={ctx?.open ? "open" : "closed"}
      {...props}
    >
      {children}
    </button>
  )
}

function CollapsibleContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(CollapsibleContext)
  if (!ctx?.open) return null
  return (
    <div data-state="open" className={cn(className)} {...props}>
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
