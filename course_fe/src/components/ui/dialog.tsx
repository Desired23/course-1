"use client";

import * as React from "react";
import { Modal } from "antd";
import { XIcon } from "lucide-react";

import { cn } from "./utils";
import { interactiveTransitionStyle } from "../../lib/motion";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(componentName: string) {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside Dialog`);
  }
  return context;
}

type DialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
};

function Dialog({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
}: DialogProps) {
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
    <DialogContext.Provider value={{ open: Boolean(actualOpen), setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

type DialogButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

function DialogTrigger({ asChild, children, onClick, ...props }: DialogButtonProps) {
  const { setOpen } = useDialogContext("DialogTrigger");

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

function DialogClose({ asChild, children, onClick, ...props }: DialogButtonProps) {
  const { setOpen } = useDialogContext("DialogClose");

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

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (_props, _ref) => null,
);
DialogOverlay.displayName = "DialogOverlay";

type DialogContentProps = React.HTMLAttributes<HTMLDivElement>;

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, style, ...props }, ref) => {
    const { open, setOpen } = useDialogContext("DialogContent");
    const contentZIndex = style?.zIndex;
    const parsedZIndex =
      contentZIndex != null && Number.isFinite(Number(contentZIndex))
        ? Number(contentZIndex)
        : undefined;

    return (
      <Modal
        open={open}
        footer={null}
        closable={false}
        centered
        destroyOnHidden
        keyboard
        width="fit-content"
        zIndex={parsedZIndex}
        onCancel={() => setOpen(false)}
        styles={{
          container: {
            background: "transparent",
            boxShadow: "none",
            padding: 0,
          },
          body: { padding: 0 },
          mask: {
            backgroundColor: "rgb(0 0 0 / 0.5)",
            backdropFilter: "blur(1px)",
          },
        }}
      >
        <div
          ref={ref}
          data-slot="dialog-content"
          style={{ ...interactiveTransitionStyle, ...(style ?? {}) }}
          className={cn(
            "bg-background relative mx-auto grid w-[calc(100vw-2rem)] max-w-md gap-4 rounded-lg border p-6 shadow-xl",
            className,
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            data-slot="dialog-close-button"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            onClick={() => setOpen(false)}
          >
            <XIcon />
            <span className="sr-only">Dong</span>
          </button>
        </div>
      </Modal>
    );
  },
);
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentProps<"h2">>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentProps<"p">>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  ),
);
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
