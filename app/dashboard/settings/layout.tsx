export default function DashboardSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">{children}</div>
    </div>
  );
}
