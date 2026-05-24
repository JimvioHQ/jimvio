// app/admin/settings/suppliers/page.tsx
export const metadata = { title: "Suppliers · Platform settings" }

export default function SuppliersPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold tracking-tight">Suppliers</h2>
      <p className="text-sm text-muted-foreground">
        Build out this tab using the pattern in <code>commerce-form.tsx</code>:
        local state + dirty flag + <code>SaveBar</code> + <code>updatePlatformSettings</code>.
      </p>
    </div>
  )
}