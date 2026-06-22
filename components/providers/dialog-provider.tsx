"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  registerAppDialog,
  unregisterAppDialog,
  type AlertDialogOptions,
  type AppDialogVariant,
  type ConfirmDialogOptions,
} from "@/lib/app-dialog";
import { cn } from "@/lib/utils";

type PendingDialog =
  | {
      id: number;
      kind: "confirm";
      options: ConfirmDialogOptions;
      resolve: (value: boolean) => void;
    }
  | {
      id: number;
      kind: "alert";
      options: AlertDialogOptions;
      resolve: () => void;
    };

type DialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

const VARIANT_ICON: Record<AppDialogVariant, typeof Info> = {
  default: Info,
  destructive: AlertTriangle,
  success: CheckCircle2,
};

const VARIANT_ICON_CLASS: Record<AppDialogVariant, string> = {
  default: "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
  destructive: "bg-red-500/10 text-red-600 dark:text-red-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function confirmButtonVariant(
  variant: AppDialogVariant = "default",
): "default" | "destructive" | "success" {
  if (variant === "destructive") return "destructive";
  if (variant === "success") return "success";
  return "default";
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const activeRef = useRef<PendingDialog | null>(null);
  const queueRef = useRef<PendingDialog[]>([]);
  const idRef = useRef(0);

  const showNext = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = queueRef.current.shift() ?? null;
    rerender();
  }, []);

  const enqueue = useCallback(
    (entry: Omit<PendingDialog, "id">) => {
      const pending = { ...entry, id: ++idRef.current } as PendingDialog;
      if (!activeRef.current) {
        activeRef.current = pending;
        rerender();
        return;
      }
      queueRef.current.push(pending);
    },
    [],
  );

  const dismiss = useCallback(
    (confirmed: boolean) => {
      const current = activeRef.current;
      if (!current) return;

      if (current.kind === "confirm") {
        current.resolve(confirmed);
      } else {
        current.resolve();
      }

      activeRef.current = null;
      showNext();
    },
    [showNext],
  );

  const confirm = useCallback(
    (options: ConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => {
        enqueue({ kind: "confirm", options, resolve });
      }),
    [enqueue],
  );

  const alert = useCallback(
    (options: AlertDialogOptions) =>
      new Promise<void>((resolve) => {
        enqueue({ kind: "alert", options, resolve });
      }),
    [enqueue],
  );

  useEffect(() => {
    registerAppDialog({ confirm, alert });
    return unregisterAppDialog;
  }, [confirm, alert]);

  const active = activeRef.current;
  const open = Boolean(active);
  const variant = active?.options.variant ?? "default";
  const Icon = VARIANT_ICON[variant];

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) dismiss(false);
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden [&>button]:hidden">
          {active && (
            <>
              <DialogHeader className="mb-0 space-y-3 px-6 pt-6 pr-6">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)]",
                      VARIANT_ICON_CLASS[variant],
                    )}
                    aria-hidden
                  >
                    <Icon className="size-5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <DialogTitle className="text-base sm:text-[1.05rem]">
                      {active.options.title}
                    </DialogTitle>
                    {active.options.description ? (
                      <DialogDescription className="text-[13px] leading-relaxed">
                        {active.options.description}
                      </DialogDescription>
                    ) : null}
                  </div>
                </div>
              </DialogHeader>

              <DialogFooter className="mt-0 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-6 py-4">
                {active.kind === "confirm" ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-[var(--radius-sm)]"
                      onClick={() => dismiss(false)}
                    >
                      {active.options.cancelLabel ?? "Cancel"}
                    </Button>
                    <Button
                      type="button"
                      variant={confirmButtonVariant(variant)}
                      className="rounded-[var(--radius-sm)]"
                      onClick={() => dismiss(true)}
                    >
                      {active.options.confirmLabel ?? "Confirm"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant={confirmButtonVariant(variant)}
                    className="rounded-[var(--radius-sm)] sm:min-w-[96px]"
                    onClick={() => dismiss(true)}
                  >
                    {active.options.confirmLabel ?? "OK"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useAppDialog must be used within DialogProvider");
  }
  return ctx;
}
