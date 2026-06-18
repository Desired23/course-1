import * as React from "react"
import { Tooltip as AntTooltip } from "antd"

type Placement = "top" | "bottom" | "left" | "right" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"

function mapSide(side?: string): Placement {
  if (side === "right") return "right"
  if (side === "left") return "left"
  if (side === "bottom") return "bottom"
  return "top"
}

function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function Tooltip({ children, title, placement, delayDuration, ...props }: any) {
  let resolvedTitle: React.ReactNode = title
  let resolvedPlacement: Placement = placement ?? "top"
  let trigger: React.ReactNode = null

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const el = child as React.ReactElement<any>
    if (el.type === TooltipContent) {
      resolvedTitle = el.props.children
      if (el.props.side) resolvedPlacement = mapSide(el.props.side)
    } else if (el.type === TooltipTrigger) {
      trigger = el.props.asChild ? el.props.children : <span>{el.props.children}</span>
    }
  })

  if (resolvedTitle == null) return <>{trigger || children}</>

  return (
    <AntTooltip
      title={resolvedTitle}
      placement={resolvedPlacement}
      mouseEnterDelay={(delayDuration ?? 0) / 1000}
      {...props}
    >
      {trigger || children}
    </AntTooltip>
  )
}

function TooltipTrigger({ children, asChild: _asChild }: any) {
  return <>{children}</>
}

function TooltipContent({ children }: any) {
  return <>{children}</>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
