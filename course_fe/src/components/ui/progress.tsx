import * as React from "react"
import { Progress as AntProgress } from "antd"
import { cn } from "./utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }
>(({ className, value, max = 100, ...props }, _ref) => (
  <AntProgress
    percent={Math.round(((value ?? 0) / max) * 100)}
    showInfo={false}
    className={cn(className)}
    {...(props as any)}
  />
))
Progress.displayName = "Progress"

export { Progress }
