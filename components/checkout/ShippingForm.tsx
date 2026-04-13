"use client";

import React from "react";
import { User, Mail, Phone, MapPin, Building2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

/* 🔥 LIGHT COMPACT GLASS */
const FIELD: React.CSSProperties = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(16px) saturate(150%)",
  WebkitBackdropFilter: "blur(16px) saturate(150%)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow:
    "0 1px 6px rgba(249,115,22,0.05), inset 0 1px 0 rgba(255,255,255,0.95)",
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

  const labelCls =
    "text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 block";

  const inputCls = cn(
    "rounded-[14px] h-11 pl-10 pr-3 text-[13px] font-medium text-stone-900",
    "focus:outline-none transition-all",
    "focus:ring-2 focus:ring-orange-500/10 focus:border-orange-400/40",
    "placeholder:text-stone-400 w-full"
  );

  const iconCls =
    "absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-orange-400";

  return (
    <div className="space-y-4">
      {/* NAME */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="First Name" icon={<User className={iconCls} />}>
          <Input
            value={values.firstName}
            onChange={set("firstName")}
            placeholder="John"
            required
            className={inputCls}
          />
        </Field>

        <Field label="Last Name" icon={<User className={iconCls} />}>
          <Input
            value={values.lastName}
            onChange={set("lastName")}
            placeholder="Doe"
            className={inputCls}
          />
        </Field>
      </div>

      {/* CONTACT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Email" icon={<Mail className={iconCls} />}>
          <Input
            type="email"
            value={values.email}
            onChange={set("email")}
            placeholder="john@email.com"
            required
            autoComplete="email"
            className={inputCls}
          />
        </Field>

        <Field label="Phone" icon={<Phone className={iconCls} />}>
          <Input
            type="tel"
            value={values.phone}
            onChange={set("phone")}
            placeholder="+250 700 000 000"
            required
            autoComplete="tel"
            className={inputCls}
          />
        </Field>
      </div>

      {/* ADDRESS */}
      <Field label="Street Address" icon={<MapPin className={iconCls} />}>
        <Input
          value={values.address1}
          onChange={set("address1")}
          placeholder="123 Main Street"
          required
          autoComplete="street-address"
          className={inputCls}
        />
      </Field>

      <Field
        label="Apartment / Suite (optional)"
        icon={<Building2 className={iconCls} />}
      >
        <Input
          value={values.address2}
          onChange={set("address2")}
          placeholder="Apt 4B"
          className={inputCls}
        />
      </Field>

      {/* COUNTRY + CITY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Country" icon={<Globe className={iconCls} />}>
          <div className="relative">
            <select
              value={values.country}
              onChange={set("country")}
              className={cn(
                inputCls,
                "appearance-none pr-8 cursor-pointer"
              )}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* custom arrow */}
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6 8l4 4 4-4" />
            </svg>
          </div>
        </Field>

        <Field label="City" icon={<MapPin className={iconCls} />}>
          <Input
            value={values.city}
            onChange={set("city")}
            placeholder="Kigali"
            required
            autoComplete="address-level2"
            className={inputCls}
          />
        </Field>
      </div>

      {/* ZIP */}
      <Field label="ZIP / Postal Code" icon={<MapPin className={iconCls} />}>
        <Input
          value={values.zip}
          onChange={set("zip")}
          placeholder="00000"
          className={inputCls}
        />
      </Field>
    </div>
  );
}

/* 🔥 reusable field */
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">
        {label}
      </label>

      <div className="relative rounded-[14px]" style={FIELD}>
        {icon}
        {children}
      </div>
    </div>
  );
}