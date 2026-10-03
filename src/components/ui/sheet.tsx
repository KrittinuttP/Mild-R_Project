"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

/** Bottom sheet (mobile pickers). */
function SheetContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/55 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-[#f3b8c4]/15 bg-[#140a0d] text-[#fff5f7] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] outline-none",
          "pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
          className
        )}
        {...props}
      >
        <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#f3b8c4]/25" />
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-[#f3b8c4]/70 transition hover:bg-[#f3b8c4]/10 hover:text-[#fff5f7]"
          >
            <XIcon className="size-4" />
            <span className="sr-only">ปิด</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("shrink-0 px-5 pt-3 pr-14 pb-3", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-[family-name:var(--font-display)] text-lg leading-snug text-[#fff5f7]",
        className
      )}
      {...props}
    />
  )
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-3", className)}
      {...props}
    />
  )
}

export { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger }
