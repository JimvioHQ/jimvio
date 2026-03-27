"use client";

import { User, Mail, Phone, MapPin, Building2, Globe } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">Shipping details</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Where should we deliver your order?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First name"
          icon={<User className="h-4 w-4" />}
          value={values.firstName}
          onChange={set("firstName")}
          required
          className="rounded-xl min-h-[44px]"
        />
        <Input
          label="Last name"
          hint="Optional if you use a single name."
          icon={<User className="h-4 w-4" />}
          value={values.lastName}
          onChange={set("lastName")}
          className="rounded-xl min-h-[44px]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          icon={<Mail className="h-4 w-4" />}
          value={values.email}
          onChange={set("email")}
          required
          autoComplete="email"
          className="rounded-xl min-h-[44px]"
        />
        <Input
          label="Phone"
          type="tel"
          icon={<Phone className="h-4 w-4" />}
          value={values.phone}
          onChange={set("phone")}
          required
          autoComplete="tel"
          className="rounded-xl min-h-[44px]"
        />
      </div>

      <Input
        label="Street address"
        icon={<MapPin className="h-4 w-4" />}
        value={values.address1}
        onChange={set("address1")}
        required
        autoComplete="street-address"
        className="rounded-xl min-h-[44px]"
      />

      <Input
        label="Apartment, suite, etc."
        hint="Optional"
        icon={<Building2 className="h-4 w-4" />}
        value={values.address2}
        onChange={set("address2")}
        className="rounded-xl min-h-[44px]"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">Country</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none z-10" />
            <select
              value={values.country}
              onChange={set("country")}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
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
          label="City"
          icon={<MapPin className="h-4 w-4" />}
          value={values.city}
          onChange={set("city")}
          required
          autoComplete="address-level2"
          className="rounded-xl min-h-[44px]"
        />
      </div>

      <Input
        label="ZIP / Postal code"
        hint="Optional — use 00000 if your area has no postal code."
        icon={<MapPin className="h-4 w-4" />}
        value={values.zip}
        onChange={set("zip")}
        className="rounded-xl min-h-[44px]"
      />
    </div>
  );
}
