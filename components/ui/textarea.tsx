import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-tp-line bg-tp-input px-3 py-2 text-sm text-tp-text shadow-sm transition-colors",
        "placeholder:text-tp-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-cyan/50 focus-visible:border-tp-cyan/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
