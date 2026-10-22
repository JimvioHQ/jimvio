"use client";

import Link from "next/link";
import { ArrowUpRight, CircleHelp, LifeBuoy } from "lucide-react";
import { SETTINGS_HELP_HREF, SETTINGS_SUPPORT_HREF } from "@/lib/settings/nav";
import { useSettingsCenter } from "./settings-center-context";
import { SettingsCard, SettingsPageHeader } from "./settings-ui";

export function SettingsHelpPanel() {
  const { menuButton } = useSettingsCenter();

  return (
    <div>
      <SettingsPageHeader
        title="Help & Support"
        description="Use the existing Jimvio Help Center and ticket system."
        menuButton={menuButton}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SettingsCard
          title="Help Center"
          description="Guides for accounts, payments, selling, and communities."
          icon={<CircleHelp className="h-4 w-4" />}
        >
          <Link
            href={SETTINGS_HELP_HREF}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF5A1F] px-4 text-[14px] font-semibold text-white hover:bg-[#F04E15]"
          >
            Open Help Center
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </SettingsCard>

        <SettingsCard
          title="Contact support"
          description="Create a ticket if a guide does not solve the issue."
          icon={<LifeBuoy className="h-4 w-4" />}
        >
          <Link
            href={SETTINGS_SUPPORT_HREF}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 text-[14px] font-semibold text-[#111827] hover:bg-[#F9FAFB]"
          >
            Create a ticket
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </SettingsCard>
      </div>
    </div>
  );
}
