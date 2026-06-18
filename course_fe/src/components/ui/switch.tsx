import * as React from "react"
import { Switch as AntSwitch } from "antd"
import { cn } from "./utils"

const Switch = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, checked, onCheckedChange, onChange, ...props }, _ref) => (
  <AntSwitch
    checked={checked}
    className={cn(className)}
    onChange={(next, event) => {
      onCheckedChange?.(next)
      onChange?.(event as any)
    }}
    {...(props as any)}
  />
))
Switch.displayName = "Switch"

export { Switch }
