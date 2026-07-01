import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-tp-cyan/40 bg-tp-cyan/10 text-tp-cyan",
        green:   "border-transparent bg-tp-green/15 text-tp-green",
        amber:   "border-transparent bg-tp-amber/15 text-tp-amber",
        red:     "border-transparent bg-tp-red/15 text-tp-red",
        cyan:    "border-transparent bg-tp-cyan/15 text-tp-cyan",
        violet:  "border-transparent bg-tp-violet/15 text-tp-violet",
        gray:    "border-transparent bg-tp-surface-mid text-tp-muted",
        outline: "border-tp-line text-tp-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
