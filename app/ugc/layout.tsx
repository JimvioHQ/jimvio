import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getUGCWorkspaceUser } from "@/lib/ugc/workspace-user";
import { UGCWorkspaceLayoutClient } from "@/components/ugc/workspace/UGCWorkspaceLayoutClient";
import { ProductChatWidgetLoader } from "@/components/marketplace/product-chat-widget-loader";
import { LocaleProvider } from "@/context/LocaleContext";

export const metadata: Metadata = pageMetadata("ugc");

export default async function UGCLayout({ children }: { children: React.ReactNode }) {
  const user = await getUGCWorkspaceUser();

  return (
    <LocaleProvider language={user?.language}>
      <UGCWorkspaceLayoutClient user={user}>{children}</UGCWorkspaceLayoutClient>
      <ProductChatWidgetLoader />
    </LocaleProvider>
  );
}
