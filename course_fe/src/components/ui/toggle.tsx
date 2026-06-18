import * as React from "react"
import { cn } from "./utils"

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed, onPressedChange, onClick, variant = "default", size = "default", children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      onClick={(e) => {
        onPressedChange?.(!pressed)
        onClick?.(e)
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        "hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        pressed && "bg-accent text-accent-foreground",
        !pressed && "bg-transparent",
        variant === "outline" && "border border-input bg-transparent",
        size === "sm" && "h-8 px-2",
        size === "lg" && "h-10 px-8",
        size === "default" && "h-9 px-3",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Toggle.displayName = "Toggle"

export { Toggle }
