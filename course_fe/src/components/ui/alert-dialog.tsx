"use client";

import * as React from "react";
import { Modal } from "antd";

import { cn } from "./utils";
import { buttonVariants } from "./button";

type AlertDialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext(componentName: string) {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside AlertDialog`);
  }
  return context;
}

type AlertDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function AlertDialog({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
}: AlertDialogProps) {
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
    <AlertDialogContext.Provider value={{ open: Boolean(actualOpen), setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

function AlertDialogTrigger({ asChild, children, onClick, ...props }: TriggerProps) {
  const { setOpen } = useAlertDialogContext("AlertDialogTrigger");

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

function AlertDialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function AlertDialogOverlay() {
  return null;
}

type AlertDialogContentProps = React.HTMLAttributes<HTMLDivElement>;

function AlertDialogContent({ className, children, ...props }: AlertDialogContentProps) {
  const { open, setOpen } = useAlertDialogContext("AlertDialogContent");

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      centered
      destroyOnHidden
      maskClosable={false}
      keyboard
      width="min(420px, calc(100vw - 2rem))"
      onCancel={() => setOpen(false)}
    >
      <div
        role="alertdialog"
        data-slot="alert-dialog-content"
        className={cn("grid gap-4", className)}
        {...props}
      >
        {children}
      </div>
    </Modal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

type AlertDialogButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogButtonProps>(
  ({ className, onClick, type = "button", ...props }, ref) => {
    const { setOpen } = useAlertDialogContext("AlertDialogAction");

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) setOpen(false);
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants(), className)}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogButtonProps>(
  ({ className, onClick, type = "button", ...props }, ref) => {
    const { setOpen } = useAlertDialogContext("AlertDialogCancel");

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) setOpen(false);
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant: "outline" }), className)}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
