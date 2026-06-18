import React, { createContext, forwardRef, useContext } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Alert as AntAlert,
  Avatar as AntAvatar,
  Button as AntButton,
  Card as AntCard,
  Checkbox as AntCheckbox,
  Drawer,
  Dropdown,
  Input as AntInput,
  Modal,
  Progress as AntProgress,
  Radio,
  Select as AntSelect,
  Divider,
  Switch as AntSwitch,
  Tabs as AntTabs,
  Tag,
} from 'antd'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const Input = AntInput
export const Textarea = AntInput.TextArea
export const Card = AntCard

export const CardContent = forwardRef<HTMLDivElement, any>(function CardContent({ className, children }, ref) {
  return <div ref={ref} className={className}>{children}</div>
})

export function CardHeader({ className, children }: any) {
  return <div className={className || 'mb-4'}>{children}</div>
}

export function CardTitle({ className, children }: any) {
  return <h3 className={className || 'text-lg font-semibold'}>{children}</h3>
}

export function CardDescription({ className, children }: any) {
  return <p className={className || 'text-sm text-muted-foreground'}>{children}</p>
}

export function Label({ className, children, ...props }: any) {
  return (
    <label className={className || 'text-sm font-medium'} {...props}>
      {children}
    </label>
  )
}

function mapButtonType(type?: string, variant?: string) {
  if (variant === 'ghost') return 'text'
  if (variant === 'outline' || variant === 'secondary') return 'default'
  if (type === 'button') return 'default'
  return type || 'primary'
}

function mapButtonSize(size?: string) {
  if (size === 'lg') return 'large'
  if (size === 'sm' || size === 'icon') return 'small'
  return size
}

export function Button({ variant, size, type, children, ...props }: any) {
  if (props.asChild) {
    const child = React.Children.only(children)
    if (!React.isValidElement(child)) return child
    const { asChild, ...rest } = props
    return React.cloneElement(child, {
      ...rest,
      className: [child.props.className, rest.className].filter(Boolean).join(' '),
    } as any)
  }

  return (
    <AntButton
      {...props}
      type={mapButtonType(type, variant) as any}
      htmlType={type === 'button' ? 'button' : props.htmlType}
      size={mapButtonSize(size) as any}
    >
      {children}
    </AntButton>
  )
}

export function Badge({ variant, className, children }: any) {
  const color = variant === 'secondary' ? 'default' : undefined
  return (
    <Tag color={color} className={className}>
      {children}
    </Tag>
  )
}

export function Progress({ value, className }: any) {
  return <AntProgress percent={Math.round(value || 0)} showInfo={false} className={className} />
}

function isElementOfType(element: React.ReactNode, component: React.ComponentType<any>) {
  return React.isValidElement(element) && element.type === component
}

function collectSelectOptions(children: React.ReactNode): Array<{ value: string; label: React.ReactNode }> {
  const options: Array<{ value: string; label: React.ReactNode }> = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (isElementOfType(child, SelectItem)) {
      options.push({ value: String(child.props.value), label: child.props.children })
      return
    }
    options.push(...collectSelectOptions(child.props.children))
  })

  return options
}

function findSelectPlaceholder(children: React.ReactNode): React.ReactNode {
  let placeholder: React.ReactNode
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (isElementOfType(child, SelectValue)) {
      placeholder = child.props.placeholder
      return
    }
    const nested = findSelectPlaceholder(child.props.children)
    if (nested) placeholder = nested
  })
  return placeholder
}

export function Select({ value, onValueChange, onChange, children, className, ...props }: any) {
  return (
    <AntSelect
      {...props}
      className={className || 'w-full'}
      value={value || undefined}
      onChange={onValueChange || onChange}
      placeholder={props.placeholder || findSelectPlaceholder(children)}
      options={props.options || collectSelectOptions(children)}
    />
  )
}

export function SelectTrigger({ children }: any) {
  return <>{children}</>
}

export function SelectValue(_props: any) {
  return null
}

export function SelectContent({ children }: any) {
  return <>{children}</>
}

export function SelectItem(_props: any) {
  return null
}

export function Checkbox({ checked, onCheckedChange, onChange, children, ...props }: any) {
  return (
    <AntCheckbox
      {...props}
      checked={checked}
      onChange={(event) => {
        onCheckedChange?.(event.target.checked)
        onChange?.(event)
      }}
    >
      {children}
    </AntCheckbox>
  )
}

export function Switch({ checked, onCheckedChange, onChange, ...props }: any) {
  return (
    <AntSwitch
      {...props}
      checked={checked}
      onChange={(next, event) => {
        onCheckedChange?.(next)
        onChange?.(next, event)
      }}
    />
  )
}

const RadioGroupContext = createContext<any>(null)
const TabsContext = createContext<any>(null)

export function RadioGroup({ value, onValueChange, disabled, children }: any) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
      <div>{children}</div>
    </RadioGroupContext.Provider>
  )
}

export function RadioGroupItem({ value, ...props }: any) {
  const group = useContext(RadioGroupContext)
  return (
    <Radio
      {...props}
      value={value}
      checked={group?.value === value}
      disabled={group?.disabled}
      onChange={() => group?.onValueChange?.(value)}
    />
  )
}

function collectTabs(children: React.ReactNode): Array<{ key: string; label: React.ReactNode; children?: React.ReactNode }> {
  const labels = new Map<string, React.ReactNode>()
  const contents = new Map<string, React.ReactNode>()

  const visit = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return
      if (isElementOfType(child, TabsTrigger)) {
        labels.set(String(child.props.value), child.props.children)
        return
      }
      if (isElementOfType(child, TabsContent)) {
        contents.set(String(child.props.value), child.props.children)
        return
      }
      visit(child.props.children)
    })
  }

  visit(children)
  return Array.from(contents.entries()).map(([key, content]) => ({
    key,
    label: labels.get(key) || key,
    children: content,
  }))
}

export function Tabs({ value, defaultValue, onValueChange, children, className }: any) {
  const items = collectTabs(children)
  return (
    <TabsContext.Provider value={{ value, defaultValue, onValueChange }}>
      <AntTabs
        className={className}
        activeKey={value}
        defaultActiveKey={defaultValue}
        onChange={onValueChange}
        items={items}
      />
    </TabsContext.Provider>
  )
}

export function TabsList({ children }: any) {
  return <>{children}</>
}

export function TabsTrigger(_props: any) {
  return null
}

export function TabsContent(_props: any) {
  return null
}

export function Separator({ className, orientation }: any) {
  return <Divider type={orientation === 'vertical' ? 'vertical' : 'horizontal'} className={className} />
}

export function Alert({ className, children }: any) {
  return <AntAlert className={className} type="info" showIcon={false} description={children} />
}

export function AlertDescription({ className, children }: any) {
  return <div className={className}>{children}</div>
}

const DialogContext = createContext<{ open: boolean; onOpenChange: (open: boolean) => void } | null>(null)
const CollapsibleContext = createContext<{ open: boolean; onOpenChange?: (open: boolean) => void } | null>(null)
const DropdownMenuContext = createContext<{
  items: Array<{ key: string; label?: React.ReactNode; danger?: boolean; type?: 'divider'; onClick?: () => void }>
  registerItem: (item: { key: string; label?: React.ReactNode; danger?: boolean; type?: 'divider'; onClick?: () => void }) => void
} | null>(null)

export function Collapsible({ open, onOpenChange, children }: any) {
  return (
    <CollapsibleContext.Provider value={{ open: !!open, onOpenChange }}>
      <div>{children}</div>
    </CollapsibleContext.Provider>
  )
}

export function CollapsibleTrigger({ className, children }: any) {
  const ctx = useContext(CollapsibleContext)
  return (
    <button type="button" className={className} onClick={() => ctx?.onOpenChange?.(!ctx.open)}>
      {children}
    </button>
  )
}

export function CollapsibleContent({ children }: any) {
  const ctx = useContext(CollapsibleContext)
  if (!ctx?.open) return null
  return <>{children}</>
}

export function DropdownMenu({ children }: any) {
  const itemsRef = React.useRef<Array<{ key: string; label?: React.ReactNode; danger?: boolean; type?: 'divider'; onClick?: () => void }>>([])
  itemsRef.current = []

  const registerItem = (item: { key: string; label?: React.ReactNode; danger?: boolean; type?: 'divider'; onClick?: () => void }) => {
    itemsRef.current.push(item)
  }

  return (
    <DropdownMenuContext.Provider value={{ items: itemsRef.current, registerItem }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ children }: any) {
  const ctx = useContext(DropdownMenuContext)
  return (
    <Dropdown menu={{ items: ctx?.items || [] }} trigger={['click']}>
      {React.Children.only(children)}
    </Dropdown>
  )
}

export function DropdownMenuContent({ children }: any) {
  return <span className="hidden">{children}</span>
}

export function DropdownMenuItem({ children, onClick, className, disabled }: any) {
  const ctx = useContext(DropdownMenuContext)
  ctx?.registerItem({
    key: `${ctx.items.length}`,
    label: children,
    danger: typeof className === 'string' && className.includes('red'),
    disabled,
    onClick,
  } as any)
  return null
}

export function DropdownMenuSeparator() {
  const ctx = useContext(DropdownMenuContext)
  ctx?.registerItem({ key: `divider-${ctx.items.length}`, type: 'divider' })
  return null
}

export function ScrollArea({ className, children }: any) {
  return <div className={className || 'overflow-auto'}>{children}</div>
}

export function Dialog({ open, onOpenChange, children }: any) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogContent({ className, children }: any) {
  const ctx = useContext(DialogContext)
  return (
    <Modal
      open={!!ctx?.open}
      footer={null}
      onCancel={() => ctx?.onOpenChange(false)}
      width="min(95vw, 1100px)"
      className={className}
      destroyOnHidden
    >
      {children}
    </Modal>
  )
}

export function DialogHeader({ className, children }: any) {
  return <div className={className}>{children}</div>
}

export function DialogTitle({ className, children }: any) {
  return <h2 className={className || 'text-lg font-semibold'}>{children}</h2>
}

export function DialogDescription({ className, children }: any) {
  return <p className={className || 'text-sm text-muted-foreground'}>{children}</p>
}

export function DialogFooter({ className, children }: any) {
  return <div className={className || 'flex justify-end gap-2'}>{children}</div>
}

export function DialogTrigger({ children }: any) {
  const ctx = useContext(DialogContext)
  const child = React.Children.only(children)
  if (!React.isValidElement(child)) return child
  return React.cloneElement(child, {
    onClick: (...args: any[]) => {
      child.props.onClick?.(...args)
      ctx?.onOpenChange(true)
    },
  } as any)
}

const SheetContext = createContext<{ open: boolean; onOpenChange: (open: boolean) => void } | null>(null)

export function Sheet({ open, onOpenChange, children }: any) {
  return (
    <SheetContext.Provider value={{ open: !!open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export function SheetTrigger({ children }: any) {
  const ctx = useContext(SheetContext)
  const child = React.Children.only(children)
  if (!React.isValidElement(child)) return child
  return React.cloneElement(child, {
    onClick: (...args: any[]) => {
      child.props.onClick?.(...args)
      ctx?.onOpenChange(true)
    },
  } as any)
}

export function SheetContent({ side = 'right', className, children }: any) {
  const ctx = useContext(SheetContext)
  return (
    <Drawer
      open={!!ctx?.open}
      onClose={() => ctx?.onOpenChange(false)}
      placement={side}
      width={384}
      className={className}
      closable={false}
    >
      {children}
    </Drawer>
  )
}

export function SheetHeader({ className, children }: any) {
  return <div className={className}>{children}</div>
}

export function SheetTitle({ className, children }: any) {
  return <h2 className={className || 'text-lg font-semibold'}>{children}</h2>
}

export function SheetDescription({ className, children }: any) {
  return <p className={className || 'text-sm text-muted-foreground'}>{children}</p>
}

export function Avatar({ children, ...props }: any) {
  return <AntAvatar {...props}>{children}</AntAvatar>
}

export function AvatarFallback({ children }: any) {
  return <>{children}</>
}
