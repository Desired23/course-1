import * as React from "react"
import { Radio } from "antd"
import { cn } from "./utils"

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
} | null>(null)

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
  }
>(({ className, value, onValueChange, disabled, children, ...props }, ref) => (
  <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
    <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props}>
      {children}
    </div>
  </RadioGroupContext.Provider>
))
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { value: string }
>(({ className, value, ...props }, _ref) => {
  const group = React.useContext(RadioGroupContext)
  return (
    <Radio
      value={value}
      checked={group?.value === value}
      disabled={group?.disabled ?? (props.disabled as boolean)}
      onChange={() => group?.onValueChange?.(value)}
      className={cn(className)}
    />
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
