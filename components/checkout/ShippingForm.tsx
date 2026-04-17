"use client";

import React from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Globe,
} from "lucide-react";
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

type Props = {
  values: ShippingFormValues;
  onChange: (patch: Partial<ShippingFormValues>) => void;
};

export default function ShippingForm({ values, onChange }: Props) {
  const setField =
    (key: keyof ShippingFormValues) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.value;

        if (key === "country") {
          const selected = COUNTRIES.find((c) => c.name === value);

          onChange({
            country: value,
            countryCode: selected?.code ?? "RW",
          });

          return;
        }

        onChange({ [key]: value } as Partial<ShippingFormValues>);
      };

  const inputCls = cn(
    "rounded-[14px] h-11 pl-10 pr-3 text-[13px] font-medium",
    "text-stone-900 dark:text-white bg-transparent w-full",
    "focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-400/40",
    "placeholder:text-stone-400 transition-all"
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
            onChange={setField("firstName")}
            placeholder="John"
            required
            className={inputCls}
          />
        </Field>

        <Field label="Last Name" icon={<User className={iconCls} />}>
          <Input
            value={values.lastName}
            onChange={setField("lastName")}
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
            onChange={setField("email")}
            placeholder="john@email.com"
            required
            className={inputCls}
          />
        </Field>

        <Field label="Phone" icon={<Phone className={iconCls} />}>
          <Input
            type="tel"
            value={values.phone}
            onChange={setField("phone")}
            placeholder="+250 700 000 000"
            required
            className={inputCls}
          />
        </Field>
      </div>

      {/* ADDRESS */}
      <Field label="Street Address" icon={<MapPin className={iconCls} />}>
        <Input
          value={values.address1}
          onChange={setField("address1")}
          placeholder="123 Main Street"
          required
          className={inputCls}
        />
      </Field>

      <Field
        label="Apartment / Suite (optional)"
        icon={<Building2 className={iconCls} />}
      >
        <Input
          value={values.address2}
          onChange={setField("address2")}
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
              onChange={setField("country")}
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
            onChange={setField("city")}
            placeholder="Kigali"
            required
            className={inputCls}
          />
        </Field>
      </div>

      {/* ZIP */}
      <Field label="ZIP / Postal Code" icon={<MapPin className={iconCls} />}>
        <Input
          value={values.zip}
          onChange={setField("zip")}
          placeholder="00000"
          className={inputCls}
        />
      </Field>
    </div>
  );
}

/* FIELD COMPONENT */
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

      <div className="relative rounded-[14px] bg-white/55 dark:bg-surface/50 backdrop-blur-md border border-white/80 dark:border-border shadow-sm shadow-orange-500/5">
        {icon}
        {children}
      </div>
    </div>
  );
}