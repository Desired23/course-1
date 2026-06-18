import * as React from "react"
import { Avatar as AntAvatar } from "antd"
import { cn } from "./utils"

function AvatarImage(_props: any) {
  return null
}

function AvatarFallback(_props: any) {
  return null
}

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { src?: string; alt?: string }>(
  ({ className, children, src: srcProp, alt, ...props }, _ref) => {
    let imageSrc: string | undefined = srcProp
    let fallback: React.ReactNode

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return
      const el = child as React.ReactElement<any>
      if (el.type === AvatarImage && !imageSrc) {
        imageSrc = el.props.src
      } else if (el.type === AvatarFallback) {
        fallback = el.props.children
      }
    })

    return (
      <AntAvatar src={imageSrc || undefined} alt={alt} className={cn("size-8 shrink-0", className)} {...(props as any)}>
        {!imageSrc ? fallback : undefined}
      </AntAvatar>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar, AvatarImage, AvatarFallback }
