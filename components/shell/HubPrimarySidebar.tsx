"use client";

import { PrimarySidebar, resolveSidebarActiveItem } from "@/components/shell/PrimarySidebar";
import { usePathname } from "next/navigation";
import HubSidebar from "@/app/communities/components/sidebar";

type HubPrimarySidebarProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  username?: string;
  unreadMessages?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export default function HubPrimarySidebar({
  collapsed: _collapsed,
  onToggleCollapse: _onToggleCollapse,
  username,
  unreadMessages,
  mobileOpen,
  onMobileClose,
}: HubPrimarySidebarProps) {
  void _collapsed;
  void _onToggleCollapse;
  const pathname = usePathname();

  return (
    <>
      <div className="hidden h-full shrink-0 lg:block">
        <PrimarySidebar activeItem={resolveSidebarActiveItem(pathname)} />
      </div>
      {/* Always mount mobile drawer shell so hamburger open is CSS-only (no cold mount). */}
      <HubSidebar
        collapsed={false}
        username={username ?? ""}
        unreadMessages={unreadMessages ?? 0}
        mobileOpen={Boolean(mobileOpen)}
        onMobileClose={onMobileClose}
        mobileOnly
      />
    </>
  );
}
