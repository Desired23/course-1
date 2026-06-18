import * as React from "react"
import { Collapse } from "antd"
import { cn } from "./utils"

type AccordionItem = { key: string; label: React.ReactNode; children?: React.ReactNode }

const AccordionContext = React.createContext<{
  items: AccordionItem[]
  register: (item: AccordionItem) => void
  type: "single" | "multiple"
  value?: string | string[]
  onValueChange?: (val: string) => void
} | null>(null)

function Accordion({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible: _c,
  children,
  className,
  ...props
}: {
  type?: "single" | "multiple"
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (val: string) => void
  collapsible?: boolean
  children?: React.ReactNode
  className?: string
  [key: string]: any
}) {
  const itemsRef = React.useRef<AccordionItem[]>([])
  itemsRef.current = []

  const register = (item: AccordionItem) => {
    itemsRef.current.push(item)
  }

  const activeKey = value ?? defaultValue

  return (
    <AccordionContext.Provider value={{ items: itemsRef.current, register, type, value, onValueChange }}>
      {/* render children to collect items into itemsRef before Collapse reads it */}
      <span style={{ display: 'none' }}>{children}</span>
      <Collapse
        accordion={type === "single"}
        activeKey={activeKey as any}
        onChange={(key) => onValueChange?.(Array.isArray(key) ? key[0] : key)}
        items={itemsRef.current}
        className={cn(className)}
        {...props}
      />
    </AccordionContext.Provider>
  )
}

function AccordionItem({ value, children }: { value: string; children?: React.ReactNode }) {
  const ctx = React.useContext(AccordionContext)
  const label = React.Children.toArray(children).find(
    c => React.isValidElement(c) && (c as React.ReactElement).type === AccordionTrigger
  ) as React.ReactElement<any> | undefined

  const content = React.Children.toArray(children).find(
    c => React.isValidElement(c) && (c as React.ReactElement).type === AccordionContent
  ) as React.ReactElement<any> | undefined

  ctx?.register({
    key: value,
    label: label?.props.children ?? value,
    children: content?.props.children,
  })
  return null
}

function AccordionTrigger({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>
}

function AccordionContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
