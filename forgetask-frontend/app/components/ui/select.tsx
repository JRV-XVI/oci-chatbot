"use client";

import * as React from "react";

import { cn } from "./utils";

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

function SelectGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />;
}

function SelectValue({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn(className)} {...props} />;
}

function SelectTrigger({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button type="button" className={cn(className)} {...props} />
  );
}

function SelectContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />;
}

function SelectLabel({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn(className)} {...props} />;
}

function SelectItem({ className, ...props }: React.ComponentProps<"option">) {
  return <option className={cn(className)} {...props} />;
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />;
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<"button">) {
  return <button type="button" className={cn(className)} {...props} />;
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<"button">) {
  return <button type="button" className={cn(className)} {...props} />;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
