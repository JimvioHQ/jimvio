export type AppDialogVariant = "default" | "destructive" | "success";

export type ConfirmDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: AppDialogVariant;
};

export type AlertDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: AppDialogVariant;
};

type DialogAPI = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
};

let dialogApi: DialogAPI | null = null;

export function registerAppDialog(api: DialogAPI) {
  dialogApi = api;
}

export function unregisterAppDialog() {
  dialogApi = null;
}

function normalizeConfirm(
  options: ConfirmDialogOptions | string,
): ConfirmDialogOptions {
  if (typeof options === "string") {
    return { title: "Confirm", description: options };
  }
  return options;
}

function normalizeAlert(options: AlertDialogOptions | string): AlertDialogOptions {
  if (typeof options === "string") {
    return { title: "Notice", description: options };
  }
  return options;
}

/** Promise-based replacement for `window.confirm`. */
export function appConfirm(
  options: ConfirmDialogOptions | string,
): Promise<boolean> {
  const opts = normalizeConfirm(options);
  if (dialogApi) return dialogApi.confirm(opts);
  if (typeof window !== "undefined") {
    return Promise.resolve(
      window.confirm(opts.description ?? opts.title),
    );
  }
  return Promise.resolve(false);
}

/** Promise-based replacement for `window.alert`. */
export function appAlert(options: AlertDialogOptions | string): Promise<void> {
  const opts = normalizeAlert(options);
  if (dialogApi) return dialogApi.alert(opts);
  if (typeof window !== "undefined") {
    window.alert(opts.description ?? opts.title);
  }
  return Promise.resolve();
}
