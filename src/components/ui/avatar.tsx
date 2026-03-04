"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const AvatarContext = React.createContext<{
  size: "default" | "sm" | "lg"
  status: "idle" | "loading" | "loaded" | "error"
  setStatus: React.Dispatch<React.SetStateAction<"idle" | "loading" | "loaded" | "error">>
} | null>(null)

export interface AvatarProps extends React.ComponentProps<"span"> {
  size?: "default" | "sm" | "lg"
}

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarProps) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "loaded" | "error">("idle")

  return (
    <AvatarContext.Provider value={{ size, status, setStatus }}>
      <span
        data-slot="avatar"
        data-size={size}
        className={cn(
          "group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
}

function AvatarImage({
  className,
  src,
  onLoadingStatusChange,
  ...props
}: React.ComponentProps<"img"> & { onLoadingStatusChange?: (status: "idle" | "loading" | "loaded" | "error") => void }) {
  const context = React.useContext(AvatarContext)
  if (!context) throw new Error("AvatarImage must be within Avatar")

  React.useLayoutEffect(() => {
    if (!src) {
      context.setStatus("error")
      onLoadingStatusChange?.("error")
    } else {
      context.setStatus("loading")
      onLoadingStatusChange?.("loading")
    }
  }, [src])

  if (context.status === "error") return null

  return (
    <img
      src={src}
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      onLoad={() => {
        context.setStatus("loaded")
        onLoadingStatusChange?.("loaded")
      }}
      onError={() => {
        context.setStatus("error")
        onLoadingStatusChange?.("error")
      }}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const context = React.useContext(AvatarContext)
  if (!context) throw new Error("AvatarFallback must be within Avatar")

  if (context.status === "loaded") return null

  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full ring-2 select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "bg-muted text-muted-foreground ring-background relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
}
