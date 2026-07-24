/** Legacy Creator Studio layout — child pages redirect into Owner Console. */
export default function LegacyCreatorCommunityLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ communityId: string }>;
}) {
  return <>{children}</>;
}
