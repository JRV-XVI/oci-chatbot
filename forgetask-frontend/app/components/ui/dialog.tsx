"use client";

import * as React from "react";

import { cn } from "./utils";

function Dialog({ children }: React.PropsWithChildren<Record<string, unknown>>) {
  return <>{children}</>;
}

function DialogTrigger({ children, ...props }: React.ComponentPropsWithoutRef<"button">) {
  return (
    <button type="button" data-slot="dialog-trigger" {...props}>
      {children}
    </button>
  );
}

function DialogPortal({ children }: React.PropsWithChildren<Record<string, unknown>>) {
  return <>{children}</>;
}

function DialogClose({ children, ...props }: React.ComponentPropsWithoutRef<"button">) {
  return (
    <button type="button" data-slot="dialog-close" {...props}>
      {children}
    </button>
  );
}

function DialogOverlay({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-content"
      className={cn(
        "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
  );
}

function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<"h2">) {
  return <h2 data-slot="dialog-title" className={cn("text-lg leading-none font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return <p data-slot="dialog-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

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
