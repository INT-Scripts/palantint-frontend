"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

type TabsContextValue = {
  value?: string
  onValueChange?: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

export interface TabsProps extends React.ComponentProps<"div"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: "horizontal" | "vertical"
}

function Tabs({
  className,
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlled = controlledValue !== undefined
  
  const value = isControlled ? controlledValue : uncontrolledValue
  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(
          "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
          className
        )}
        {...props}
      />
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "rounded-none p-1 group/tabs-list flex w-full items-center justify-start overflow-x-auto scrollbar-hide border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-1 bg-transparent border-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof tabsListVariants>) {
  return (
    <div
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      role="tablist"
      {...props}
    />
  )
}

export interface TabsTriggerProps extends Omit<React.ComponentProps<"button">, "value"> {
  value: string
}

function TabsTrigger({
  className,
  value,
  ...props
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")

  const isSelected = context.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      data-slot="tabs-trigger"
      onClick={() => context.onValueChange?.(value)}
      className={cn(
        "relative inline-flex flex-shrink-0 items-center justify-center gap-2 px-4 py-3 text-sm font-mono font-bold uppercase tracking-wide whitespace-nowrap transition-all border-b-2 border-transparent disabled:pointer-events-none disabled:opacity-50",
        "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50",
        "data-[state=active]:text-blue-400 data-[state=active]:bg-zinc-800 data-[state=active]:border-blue-500",
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export interface TabsContentProps extends React.ComponentProps<"div"> {
  value: string
}

function TabsContent({
  className,
  value,
  ...props
}: TabsContentProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")

  if (context.value !== value) return null

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      data-state="active"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
