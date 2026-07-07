"use client";

import { PrimarySidebar, resolveSidebarActiveItem } from "@/components/shell/PrimarySidebar";
import { usePathname } from "next/navigation";
import HubSidebar from "@/app/c/components/sidebar";

type HubPrimarySidebarProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  username?: string;
  unreadMessages?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export default function HubPrimarySidebar({
  collapsed,
  onToggleCollapse,
  username,
  unreadMessages,
  mobileOpen,
  onMobileClose,
}: HubPrimarySidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="hidden h-full shrink-0 lg:block">
        <PrimarySidebar activeItem={resolveSidebarActiveItem(pathname)} />
      </div>
      {mobileOpen && (
        <HubSidebar
          collapsed={false}
          username={username ?? ""}
          unreadMessages={unreadMessages ?? 0}
          mobileOpen={mobileOpen}
          onMobileClose={onMobileClose}
        />
      )}
    </>
  );
}
