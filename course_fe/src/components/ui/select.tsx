import * as React from "react"
import { Select as AntSelect } from "antd"

function isElementOfType(element: React.ReactNode, component: React.ComponentType<any>) {
  return React.isValidElement(element) && (element as React.ReactElement).type === component
}

function collectSelectOptions(children: React.ReactNode): Array<{ value: string; label: React.ReactNode }> {
  const options: Array<{ value: string; label: React.ReactNode }> = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const el = child as React.ReactElement<any>
    if (isElementOfType(el, SelectItem)) {
      options.push({ value: String(el.props.value), label: el.props.children })
      return
    }
    if (el.props.children) {
      options.push(...collectSelectOptions(el.props.children))
    }
  })
  return options
}

function findSelectPlaceholder(children: React.ReactNode): React.ReactNode {
  let placeholder: React.ReactNode
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const el = child as React.ReactElement<any>
    if (isElementOfType(el, SelectValue)) {
      placeholder = el.props.placeholder
      return
    }
    if (el.props.children) {
      const nested = findSelectPlaceholder(el.props.children)
      if (nested) placeholder = nested
    }
  })
  return placeholder
}

function findTrigger(children: React.ReactNode): { className?: string; style?: React.CSSProperties } {
  let found: { className?: string; style?: React.CSSProperties } = {}
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || found.className || found.style) return
    const el = child as React.ReactElement<any>
    if (isElementOfType(el, SelectTrigger)) {
      found = { className: el.props.className, style: el.props.style }
      return
    }
    if (el.props.children) {
      const nested = findTrigger(el.props.children)
      if (nested.className || nested.style) found = nested
    }
  })
  return found
}

function Select({ value, onValueChange, onChange, children, className, style, disabled, ...props }: any) {
  const trigger = findTrigger(children)
  return (
    <AntSelect
      {...props}
      className={className ?? trigger.className ?? 'w-full'}
      style={style ?? trigger.style}
      value={value || undefined}
      disabled={disabled}
      onChange={onValueChange ?? onChange}
      placeholder={props.placeholder ?? findSelectPlaceholder(children)}
      options={props.options ?? collectSelectOptions(children)}
      popupMatchSelectWidth={false}
    />
  )
}

function SelectTrigger({ children }: any) {
  return <>{children}</>
}

function SelectValue(_props: any) {
  return null
}

function SelectContent({ children }: any) {
  return <>{children}</>
}

function SelectItem(_props: any) {
  return null
}

function SelectGroup({ children }: any) {
  return <>{children}</>
}

function SelectLabel({ children }: any) {
  return <>{children}</>
}

function SelectSeparator() {
  return null
}

function SelectScrollUpButton() {
  return null
}

function SelectScrollDownButton() {
  return null
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
