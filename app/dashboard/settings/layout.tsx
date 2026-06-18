import { ReactNode } from "react";

export default function DashboardSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {children}
    </div>
  );
}
