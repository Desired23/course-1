import * as React from "react"
import { Dropdown } from "antd"
import { cn } from "./utils"

type MenuItem = {
  key: string
  label?: React.ReactNode
  danger?: boolean
  type?: "divider"
  disabled?: boolean
  onClick?: () => void
}

const DropdownMenuContext = React.createContext<{
  items: MenuItem[]
  registerItem: (item: MenuItem) => void
} | null>(null)

function DropdownMenu({ children }: { children?: React.ReactNode }) {
  const itemsRef = React.useRef<MenuItem[]>([])
  itemsRef.current = []

  const registerItem = (item: MenuItem) => {
    itemsRef.current.push(item)
  }

  return (
    <DropdownMenuContext.Provider value={{ items: itemsRef.current, registerItem }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuTrigger({ children, asChild: _a }: { children?: React.ReactNode; asChild?: boolean }) {
  const ctx = React.useContext(DropdownMenuContext)
  const child = React.Children.only(children) as React.ReactElement<any>
  return (
    <Dropdown menu={{ items: ctx?.items ?? [] }} trigger={["click"]}>
      {child}
    </Dropdown>
  )
}

function DropdownMenuContent({ children }: { children?: React.ReactNode }) {
  // Children are processed by MenuItem hooks during render; this wrapper renders nothing visible
  return <span style={{ display: 'none' }}>{children}</span>
}

function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
  inset: _inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; disabled?: boolean }) {
  const ctx = React.useContext(DropdownMenuContext)
  ctx?.registerItem({
    key: String(ctx.items.length),
    label: children as React.ReactNode,
    danger: typeof className === "string" && className.includes("destructive"),
    disabled,
    onClick,
  })
  return null
}

function DropdownMenuSeparator(_props: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(DropdownMenuContext)
  ctx?.registerItem({ key: `divider-${ctx.items.length}`, type: "divider" })
  return null
}

function DropdownMenuLabel({ children, className, inset: _inset, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  const ctx = React.useContext(DropdownMenuContext)
  ctx?.registerItem({
    key: `label-${ctx.items.length}`,
    label: <span className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)} {...props}>{children}</span>,
    disabled: true,
  })
  return null
}

function DropdownMenuGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuCheckboxItem({ children, checked, onCheckedChange, className, ...props }: any) {
  const ctx = React.useContext(DropdownMenuContext)
  ctx?.registerItem({
    key: String(ctx.items.length),
    label: children,
    onClick: () => onCheckedChange?.(!checked),
  })
  return null
}

function DropdownMenuRadioGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuRadioItem({ children, value, ...props }: any) {
  const ctx = React.useContext(DropdownMenuContext)
  ctx?.registerItem({
    key: String(ctx.items.length),
    label: children,
    onClick: () => props.onSelect?.(value),
  })
  return null
}

function DropdownMenuPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSub({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSubTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSubContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
}
