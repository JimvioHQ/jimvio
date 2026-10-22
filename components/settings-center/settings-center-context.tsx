"use client";

import { createContext, useContext, type ReactNode } from "react";

type SettingsCenterContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
  menuButton: ReactNode;
};

const SettingsCenterContext = createContext<SettingsCenterContextValue | null>(null);

export function SettingsCenterProvider({
  value,
  children,
}: {
  value: SettingsCenterContextValue;
  children: ReactNode;
}) {
  return <SettingsCenterContext.Provider value={value}>{children}</SettingsCenterContext.Provider>;
}

export function useSettingsCenter() {
  const value = useContext(SettingsCenterContext);
  if (!value) {
    throw new Error("useSettingsCenter must be used inside SettingsCenterShell");
  }
  return value;
}
