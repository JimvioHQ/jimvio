export const dynamic = "force-dynamic";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

import { ProductChatWidgetLoader } from "@/components/marketplace/product-chat-widget-loader";
import { JimvioOSLoader } from "@/components/jimvio-os";
import { CommandCenterLoader } from "@/components/command-center/CommandCenterLoader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {children}
      <ProductChatWidgetLoader />
      <JimvioOSLoader />
      <CommandCenterLoader />
    </DashboardShell>
  );
}

