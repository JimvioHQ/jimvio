"use client";

import { Input } from "@/components/ui/input";

const COUNTRIES = [
  { code: "RW", name: "Rwanda" },
  { code: "KE", name: "Kenya" },
  { code: "UG", name: "Uganda" },
  { code: "TZ", name: "Tanzania" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];

export type ShippingFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  country: string;
  countryCode: string;
  zip: string;
};

export function ShippingForm({
  values,
  onChange,
}: {
  values: ShippingFormValues;
  onChange: (patch: Partial<ShippingFormValues>) => void;
}) {
  const set =
    (key: keyof ShippingFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value;
      if (key === "country") {
        const c = COUNTRIES.find((x) => x.name === v);
        onChange({ country: v, countryCode: c?.code ?? "RW" });
        return;
      }
      onChange({ [key]: v } as Partial<ShippingFormValues>);
    };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Shipping</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First name" value={values.firstName} onChange={set("firstName")} required />
        <Input
          label="Last name"
          hint="Optional if you use a single name — we’ll repeat your first name."
          value={values.lastName}
          onChange={set("lastName")}
        />
      </div>
      <Input label="Email" type="email" value={values.email} onChange={set("email")} required />
      <Input label="Phone" type="tel" value={values.phone} onChange={set("phone")} required />
      <Input label="Address line 1" value={values.address1} onChange={set("address1")} required />
      <Input label="Address line 2 (optional)" value={values.address2} onChange={set("address2")} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="City" value={values.city} onChange={set("city")} required />
        <div>
          <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Country</label>
          <select
            value={values.country}
            onChange={set("country")}
            className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)]"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Input
        label="ZIP / Postal code"
        hint="Optional if your area has no postal code — we use 00000 when blank."
        value={values.zip}
        onChange={set("zip")}
      />
    </div>
  );
}
