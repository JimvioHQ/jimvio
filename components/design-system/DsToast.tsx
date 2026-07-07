"use client";

import * as React from "react";
import { Toaster as SonnerToaster, toast as sonnerToast, type ExternalToast } from "sonner";

/** Jimvio Design System toast host — mount once near app root. */
export function DsToaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      richColors
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-dm-sans), sans-serif",
          fontWeight: 600,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text-primary)",
          zIndex: "var(--ds-z-toast)",
        },
      }}
      {...props}
    />
  );
}

type DsToastMessage = string | React.ReactNode;

function withDsDefaults(message: DsToastMessage, options?: ExternalToast): ExternalToast {
  return {
    ...options,
    style: {
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-dm-sans), sans-serif",
      fontWeight: 600,
      border: "1px solid var(--color-border)",
      background: "var(--color-surface)",
      color: "var(--color-text-primary)",
      ...options?.style,
    },
  };
}

/** Typed toast API — same behavior as Sonner, DS-styled defaults. */
export const dsToast = {
  message: (message: DsToastMessage, options?: ExternalToast) =>
    sonnerToast(message, withDsDefaults(message, options)),
  success: (message: DsToastMessage, options?: ExternalToast) =>
    sonnerToast.success(message, withDsDefaults(message, options)),
  error: (message: DsToastMessage, options?: ExternalToast) =>
    sonnerToast.error(message, withDsDefaults(message, options)),
  info: (message: DsToastMessage, options?: ExternalToast) =>
    sonnerToast.info(message, withDsDefaults(message, options)),
  warning: (message: DsToastMessage, options?: ExternalToast) =>
    sonnerToast.warning(message, withDsDefaults(message, options)),
  loading: (message: DsToastMessage, options?: ExternalToast) =>
    sonnerToast.loading(message, withDsDefaults(message, options)),
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  custom: sonnerToast.custom,
};
