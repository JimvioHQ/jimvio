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
    <div className="space-y-10">
      <div>
        <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-stone-400 mb-2">Logistics Coordinates</h3>
        <p className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">Authorize destination registry for this trade batch.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Legal First Name"
          icon={<User className="h-4 w-4 text-orange-500" />}
          value={values.firstName}
          onChange={set("firstName")}
          required
          className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
        />
        <Input
          label="Legal Last Name"
          icon={<User className="h-4 w-4 text-orange-500" />}
          value={values.lastName}
          onChange={set("lastName")}
          className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Registry Email"
          type="email"
          icon={<Mail className="h-4 w-4 text-orange-500" />}
          value={values.email}
          onChange={set("email")}
          required
          autoComplete="email"
          className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
        />
        <Input
          label="Authority Phone"
          type="tel"
          icon={<Phone className="h-4 w-4 text-orange-500" />}
          value={values.phone}
          onChange={set("phone")}
          required
          autoComplete="tel"
          className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
        />
      </div>

      <Input
        label="Primary Vector (Street)"
        icon={<MapPin className="h-4 w-4 text-orange-500" />}
        value={values.address1}
        onChange={set("address1")}
        required
        autoComplete="street-address"
        className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
      />

      <Input
        label="Secondary Vector (Suite/Bldg)"
        icon={<Building2 className="h-4 w-4 text-orange-500" />}
        value={values.address2}
        onChange={set("address2")}
        className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-stone-300 mb-2 block">Sovereign State</label>
          <div className="relative group">
            <Globe className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500 pointer-events-none z-10 transition-transform group-focus-within:scale-110" />
            <select
              value={values.country}
              onChange={set("country")}
              className="w-full h-14 pl-14 pr-6 rounded-[20px] border border-stone-50 bg-stone-50/50 shadow-inner text-sm font-black text-stone-900 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:bg-white focus:border-orange-500/20 transition-all appearance-none uppercase tracking-widest"
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
          label="Registry City"
          icon={<MapPin className="h-4 w-4 text-orange-500" />}
          value={values.city}
          onChange={set("city")}
          required
          autoComplete="address-level2"
          className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
        />
      </div>

      <Input
        label="Regional Index (ZIP)"
        icon={<MapPin className="h-4 w-4 text-orange-500" />}
        value={values.zip}
        onChange={set("zip")}
        className="rounded-[20px] h-14 bg-stone-50/50 border-stone-50 shadow-inner font-bold text-stone-900"
      />
    </div>
  );
}
