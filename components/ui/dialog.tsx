// "use client";

// import * as React from "react";
// import * as DialogPrimitive from "@radix-ui/react-dialog";
// import { X } from "lucide-react";
// import { cn } from "@/lib/utils";

// const Dialog = DialogPrimitive.Root;
// const DialogTrigger = DialogPrimitive.Trigger;
// const DialogPortal = DialogPrimitive.Portal;
// const DialogClose = DialogPrimitive.Close;

// const DialogOverlay = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Overlay>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
// >(({ className, ...props }, ref) => (
//   <DialogPrimitive.Overlay
//     ref={ref}
//     className={cn(
//       "fixed inset-0 z-[9999] bg-ink-darker/60 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-in",
//       className
//     )}
//     {...props}
//   />
// ));
// DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// const DialogContent = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Content>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
//     /** Overlay z-index (e.g. above `WorkspaceRoomOverlay` at z-[10001]). */
//     overlayClassName?: string;
//   }
// >(({ className, children, overlayClassName, ...props }, ref) => (
//   <DialogPortal>
//     <DialogOverlay className={overlayClassName} />
//     <DialogPrimitive.Content
//       ref={ref}
//       className={cn(
//         "fixed left-[50%] top-[50%] z-[10000] translate-x-[-50%] translate-y-[-50%]",
//         "w-full max-w-lg rounded-sm border border-white/10 bg-slate-900/90 p-6 shadow-none",
//         "data-[state=open]:animate-scale-in",
//         className
//       )}
//       {...props}
//     >
//       {children}
//       <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 text-[var(--color-text-muted)] transition-all hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]">
//         <X className="h-4 w-4" />
//       </DialogPrimitive.Close>
//     </DialogPrimitive.Content>
//   </DialogPortal>
// ));
// DialogContent.displayName = DialogPrimitive.Content.displayName;

// const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
//   <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...props} />
// );

// const DialogTitle = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Title>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
// >(({ className, ...props }, ref) => (
//   <DialogPrimitive.Title
//     ref={ref}
//     className={cn("text-xl font-bold text-white", className)}
//     {...props}
//   />
// ));
// DialogTitle.displayName = DialogPrimitive.Title.displayName;

// const DialogDescription = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Description>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
// >(({ className, ...props }, ref) => (
//   <DialogPrimitive.Description
//     ref={ref}
//     className={cn("text-sm text-white/60", className)}
//     {...props}
//   />
// ));
// DialogDescription.displayName = DialogPrimitive.Description.displayName;

// export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose };

// components/ui/dialog.tsx

"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // ✅ Use a neutral dark overlay that works in both modes
      "fixed inset-0 z-[9999]",
      "bg-black/50 dark:bg-black/70",
      "backdrop-blur-[2px]",
      "data-[state=open]:animate-fade-in",
      "data-[state=closed]:animate-fade-in",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string;
  }
>(({ className, children, overlayClassName, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Position
        "fixed left-[50%] top-[50%] z-[10000]",
        "translate-x-[-50%] translate-y-[-50%]",
        "w-full max-w-lg",
        // ✅ Theme-aware background, border, radius
        "rounded-[var(--radius-lg)]",
        "border border-[var(--color-border)]",
        "bg-[var(--color-surface)]",
        // ✅ Theme-aware shadow
        "shadow-[var(--shadow-xl)]",
        // Padding
        "p-6",
        // Animation
        "data-[state=open]:animate-scale-in",
        className
      )}
      {...props}
    >
      {children}

      {/* ✅ Close button using theme tokens */}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4",
          "rounded-[var(--radius-sm)] p-1.5",
          "text-[var(--color-text-muted)]",
          "hover:bg-[var(--color-surface-secondary)]",
          "hover:text-[var(--color-text-primary)]",
          "transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1",
        )}
        aria-label="Close dialog"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-1.5 mb-4 pr-6", className)}
    {...props}
  />
);

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6",
      "pt-4 border-t border-[var(--color-border)]",
      className
    )}
    {...props}
  />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      // ✅ Uses theme primary text — works in light and dark
      "text-[length:1.125rem] font-bold leading-snug tracking-tight",
      "text-[var(--color-text-primary)]",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      // ✅ Uses theme muted text — adapts to dark mode automatically
      "text-sm leading-relaxed",
      "text-[var(--color-text-muted)]",
      className
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ✅ Bonus: a theme-aware section divider for use inside dialogs
const DialogSeparator = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "my-4 h-px w-full",
      "bg-[var(--color-border)]",
      className
    )}
  />
);

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogSeparator,
  DialogClose,
};