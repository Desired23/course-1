import * as React from "react"
import { Checkbox as AntCheckbox } from "antd"
import { cn } from "./utils"

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, checked, onCheckedChange, onChange, children, ...props }, _ref) => (
  <AntCheckbox
    checked={checked}
    className={cn(className)}
    onChange={(e) => {
      onCheckedChange?.(e.target.checked)
      onChange?.(e as any)
    }}
    {...(props as any)}
  >
    {children}
  </AntCheckbox>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
