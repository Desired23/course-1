import * as React from "react"
import { Divider } from "antd"
import { cn } from "./utils"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical"; decorative?: boolean }
>(({ className, orientation = "horizontal", decorative: _decorative, ...props }, _ref) => (
  <Divider
    type={orientation === "vertical" ? "vertical" : "horizontal"}
    className={cn(orientation === "horizontal" ? "my-1" : "mx-1 h-full", className)}
    {...(props as any)}
  />
))
Separator.displayName = "Separator"

export { Separator }
