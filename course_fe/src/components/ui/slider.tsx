import * as React from "react"
import { Slider as AntSlider } from "antd"
import { cn } from "./utils"

const Slider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number[]
    defaultValue?: number[]
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    onValueChange?: (value: number[]) => void
    onValueCommit?: (value: number[]) => void
  }
>(({ className, value, defaultValue, min = 0, max = 100, step = 1, disabled, onValueChange, onValueCommit, ...props }, _ref) => {
  const single = value ? value[0] : undefined
  const singleDefault = defaultValue ? defaultValue[0] : undefined
  return (
    <AntSlider
      value={single}
      defaultValue={singleDefault}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(v) => onValueChange?.([v as number])}
      onChangeComplete={(v) => onValueCommit?.([v as number])}
      className={cn("w-full", className)}
    />
  )
})
Slider.displayName = "Slider"

export { Slider }
