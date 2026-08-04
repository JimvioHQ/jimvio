export const dynamic = "force-dynamic";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

import { ProductChatWidgetLoader } from "@/components/marketplace/product-chat-widget-loader";
import { JimvioOSLoader } from "@/components/jimvio-os";

// CommandCenterLoader (⌘K) is mounted once in the root layout so it works
// platform-wide — do not remount it here to avoid duplicate portals/listeners.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {children}
      <ProductChatWidgetLoader />
      <JimvioOSLoader />
    </DashboardShell>
  );
}

