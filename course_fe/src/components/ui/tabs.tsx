import * as React from "react"
import { Tabs as AntTabs } from "antd"
import { cn } from "./utils"

function isType(el: React.ReactNode, comp: React.ComponentType<any>) {
  return React.isValidElement(el) && (el as React.ReactElement).type === comp
}

function collectItems(children: React.ReactNode): Array<{ key: string; label: React.ReactNode; children?: React.ReactNode }> {
  const labels = new Map<string, React.ReactNode>()
  const contents = new Map<string, React.ReactNode>()

  const visit = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return
      const el = child as React.ReactElement<any>
      if (isType(el, TabsTrigger)) {
        labels.set(String(el.props.value), el.props.children)
        return
      }
      if (isType(el, TabsContent)) {
        contents.set(String(el.props.value), el.props.children)
        return
      }
      if (el.props.children) visit(el.props.children)
    })
  }
  visit(children)

  return Array.from(contents.entries()).map(([key, content]) => ({
    key,
    label: labels.get(key) ?? key,
    children: content,
  }))
}

function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
  [key: string]: any
}) {
  const items = collectItems(children)
  return (
    <AntTabs
      activeKey={value}
      defaultActiveKey={defaultValue}
      onChange={onValueChange}
      items={items}
      className={cn(className)}
      {...props}
    />
  )
}

function TabsList({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function TabsTrigger(_props: any) {
  return null
}

function TabsContent(_props: any) {
  return null
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
