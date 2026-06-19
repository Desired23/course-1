import * as React from "react";
import { Drawer } from "antd";
import { X } from "lucide-react";
import { cn } from "./utils";
import { interactiveTransitionStyle } from "../../lib/motion";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext(componentName: string) {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside Sheet`);
  }
  return context;
}

type SheetProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function Sheet({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
}: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <SheetContext.Provider value={{ open: Boolean(actualOpen), setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

type SheetButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

function SheetTrigger({ asChild, children, onClick, ...props }: SheetButtonProps) {
  const { setOpen } = useSheetContext("SheetTrigger");

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLButtonElement> }>;
    const childOnClick = child.props.onClick;

    return React.cloneElement(child, {
      ...props,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        childOnClick?.(event);
        handleClick(event);
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

function SheetClose({ asChild, children, onClick, ...props }: SheetButtonProps) {
  const { setOpen } = useSheetContext("SheetClose");

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLButtonElement> }>;
    const childOnClick = child.props.onClick;

    return React.cloneElement(child, {
      ...props,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        childOnClick?.(event);
        handleClick(event);
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

function SheetPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

const SheetOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (_props, _ref) => null,
);
SheetOverlay.displayName = "SheetOverlay";

type SheetSide = "top" | "bottom" | "left" | "right";

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetSide;
}

function getDrawerSize(
  side: SheetSide,
  className: string | undefined,
  style: React.CSSProperties | undefined,
) {
  const customSidebarWidth = style?.["--sidebar-width" as keyof React.CSSProperties];
  if (customSidebarWidth) return customSidebarWidth as string;
  if (side === "top" || side === "bottom") return "75vh";
  if (className?.includes("w-[88vw]")) return "min(88vw, 24rem)";
  if (className?.includes("sm:w-96")) return "min(100vw, 24rem)";
  if (className?.includes("w-80")) return "min(100vw, 20rem)";
  return "min(100vw, 24rem)";
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, style, ...props }, ref) => {
    const { open, setOpen } = useSheetContext("SheetContent");
    const size = getDrawerSize(side, className, style);

    return (
      <Drawer
        open={open}
        placement={side}
        closable={false}
        destroyOnHidden
        keyboard
        mask={{ closable: true }}
        size={size}
        onClose={() => setOpen(false)}
        styles={{
          body: { padding: 0 },
          mask: {
            backgroundColor: "rgb(0 0 0 / 0.7)",
            backdropFilter: "blur(1px)",
          },
        }}
      >
        <div
          ref={ref}
          style={{ ...interactiveTransitionStyle, ...(style ?? {}) }}
          className={cn(
            "bg-background relative flex h-full flex-col gap-4 p-6 shadow-xl",
            className,
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dong</span>
          </button>
        </div>
      </Drawer>
    );
  },
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.ComponentProps<"h2">>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  ),
);
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.ComponentProps<"p">>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  ),
);
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
