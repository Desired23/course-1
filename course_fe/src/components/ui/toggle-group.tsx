import * as React from "react"
import { cn } from "./utils"
import { Toggle } from "./toggle"

const ToggleGroupContext = React.createContext<{
  value?: string | string[]
  type: "single" | "multiple"
  onValueChange?: (value: string) => void
  size?: string
  variant?: string
} | null>(null)

function ToggleGroup({
  type = "single",
  value,
  onValueChange,
  children,
  className,
  size,
  variant,
  ...props
}: {
  type?: "single" | "multiple"
  value?: string | string[]
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
  size?: string
  variant?: string
  [key: string]: any
}) {
  return (
    <ToggleGroupContext.Provider value={{ value, type, onValueChange, size, variant }}>
      <div
        role="group"
        className={cn("flex items-center justify-center gap-1", className)}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

function ToggleGroupItem({
  value,
  children,
  className,
  disabled,
  ...props
}: {
  value: string
  children?: React.ReactNode
  className?: string
  disabled?: boolean
  [key: string]: any
}) {
  const ctx = React.useContext(ToggleGroupContext)
  const pressed = Array.isArray(ctx?.value)
    ? ctx.value.includes(value)
    : ctx?.value === value

  return (
    <Toggle
      pressed={pressed}
      onPressedChange={() => ctx?.onValueChange?.(value)}
      disabled={disabled}
      size={ctx?.size as any}
      variant={ctx?.variant as any}
      className={cn(className)}
      {...props}
    >
      {children}
    </Toggle>
  )
}

export { ToggleGroup, ToggleGroupItem }
