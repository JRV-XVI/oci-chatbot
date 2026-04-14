// Tremor Card [v1.0.0]

import React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "./utils"

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div"
    return (
      <Component
        ref={forwardedRef}
        className={cn(
          // base
          "relative w-full rounded-lg border p-6 text-left shadow-xs",
          // background color
          "bg-[#0D1117]",
          // border color
          "border-[#30363d]",
          className,
        )}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)

Card.displayName = "Card"

export { Card, type CardProps }