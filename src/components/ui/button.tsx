import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-xs font-mono font-bold uppercase tracking-widest transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-blue-500 focus-visible:ring-blue-500/50 focus-visible:ring-[1px] aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-500 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)]",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.6)]",
        outline:
          "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-blue-500 hover:bg-zinc-800",
        secondary:
          "bg-purple-600/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]",
        ghost:
          "hover:bg-zinc-800/50 hover:text-blue-400 text-zinc-400 border border-transparent hover:border-zinc-800",
        link: "text-blue-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
