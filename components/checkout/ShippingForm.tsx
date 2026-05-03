// "use client";

// import React from "react";
// import {
//   User,
//   Mail,
//   Phone,
//   MapPin,
//   Building2,
//   Globe,
// } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import { cn } from "@/lib/utils";
// import CustomSelect from "../ui/select-2";

// const COUNTRIES = [
//   { code: "RW", name: "Rwanda" },
//   { code: "KE", name: "Kenya" },
//   { code: "UG", name: "Uganda" },
//   { code: "TZ", name: "Tanzania" },
//   { code: "US", name: "United States" },
//   { code: "GB", name: "United Kingdom" },
// ];

// export type ShippingFormValues = {
//   firstName: string;
//   lastName: string;
//   email: string;
//   phone: string;
//   address1: string;
//   address2: string;
//   city: string;
//   country: string;
//   countryCode: string;
//   zip: string;
// };

// type Props = {
//   values: ShippingFormValues;
//   onChange: (patch: Partial<ShippingFormValues>) => void;
//   hideAddress?: boolean;
// };

// export default function ShippingForm({ values, onChange, hideAddress = false }: Props) {
//   const setField =
//     (key: keyof ShippingFormValues) =>
//       (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//         const value = e.target.value;

//         if (key === "country") {
//           const selected = COUNTRIES.find((c) => c.name === value);

//           onChange({
//             country: value,
//             countryCode: selected?.code ?? "RW",
//           });

//           return;
//         }

//         onChange({ [key]: value } as Partial<ShippingFormValues>);
//       };

//   const inputCls = cn(
//     "rounded-sm h-11 pl-10 pr-3 text-[13px] font-medium",
//     "text-stone-900 dark:text-white bg-transparent w-full",
//     "focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-400/40",
//     "placeholder:text-stone-400 transition-all"
//   );

//   const iconCls =
//     "absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-orange-400";

//   return (
//     <div className="space-y-4">
//       {/* NAME */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//         <Field label="First Name" icon={<User className={iconCls} />}>
//           <Input
//             value={values.firstName}
//             onChange={setField("firstName")}
//             placeholder="John"
//             required
//             className={inputCls}
//           />
//         </Field>

//         <Field label="Last Name" icon={<User className={iconCls} />}>
//           <Input
//             value={values.lastName}
//             onChange={setField("lastName")}
//             placeholder="Doe"
//             className={inputCls}
//           />
//         </Field>
//       </div>

//       {/* CONTACT */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//         <Field label="Email" icon={<Mail className={iconCls} />}>
//           <Input
//             type="email"
//             value={values.email}
//             onChange={setField("email")}
//             placeholder="john@email.com"
//             required
//             className={inputCls}
//           />
//         </Field>

//         <Field label="Phone" icon={<Phone className={iconCls} />}>
//           <Input
//             type="tel"
//             value={values.phone}
//             onChange={setField("phone")}
//             placeholder="+250 700 000 000"
//             required
//             className={inputCls}
//           />
//         </Field>
//       </div>

//       {!hideAddress && (
//         <>
//           {/* ADDRESS */}
//           <Field label="Street Address" icon={<MapPin className={iconCls} />}>
//             <Input
//               value={values.address1}
//               onChange={setField("address1")}
//               placeholder="123 Main Street"
//               required
//               className={inputCls}
//             />
//           </Field>

//           <Field
//             label="Apartment / Suite (optional)"
//             icon={<Building2 className={iconCls} />}
//           >
//             <Input
//               value={values.address2}
//               onChange={setField("address2")}
//               placeholder="Apt 4B"
//               className={inputCls}
//             />
//           </Field>

//           {/* COUNTRY + CITY */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <Field label="Country" icon={<Globe className={iconCls} />}>

//               <CustomSelect value={values.country}
//                 options={COUNTRIES.map((c) => ({ label: c.name, value: c.name }))}
//                 onChange={function (value: string): void {
//                   setField("country")
//                 }}
//                 className={cn(
//                   inputCls,
//                   "appearance-none pr-8 cursor-pointer"
//                 )}
//               />
//               {/* <div className="relative">
//                 <select
//                   value={values.country}
//                   onChange={setField("country")}
//                   className={cn(
//                     inputCls,
//                     "appearance-none pr-8 cursor-pointer"
//                   )}
//                 >
//                   {COUNTRIES.map((c) => (
//                     <option key={c.code} value={c.name}>
//                       {c.name}
//                     </option>
//                   ))}
//                 </select>

//                 <svg
//                   className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400 pointer-events-none"
//                   viewBox="0 0 20 20"
//                   fill="currentColor"
//                 >
//                   <path d="M6 8l4 4 4-4" />
//                 </svg>
//               </div> */}
//             </Field>

//             <Field label="City" icon={<MapPin className={iconCls} />}>
//               <Input
//                 value={values.city}
//                 onChange={setField("city")}
//                 placeholder="Kigali"
//                 required={!hideAddress}
//                 className={inputCls}
//               />
//             </Field>
//           </div>

//           {/* ZIP */}
//           <Field label="ZIP / Postal Code" icon={<MapPin className={iconCls} />}>
//             <Input
//               value={values.zip}
//               onChange={setField("zip")}
//               placeholder="00000"
//               className={inputCls}
//             />
//           </Field>
//         </>
//       )}
//     </div>
//   );
// }

// /* FIELD COMPONENT */
// function Field({
//   label,
//   icon,
//   children,
// }: {
//   label: string;
//   icon: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   return (
//     <div>
//       <label className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">
//         {label}
//       </label>

//       <div className="relative rounded-sm bg-[var(--color-surface)] dark:bg-[var(--color-surface)] border-none   border-[var(--color-border)] shadow-none">
//         {icon}
//         {children}
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState } from "react";
import { User, Mail, Phone, MapPin, Building2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, getInputValidationClasses } from "@/lib/utils";
import CustomSelect from "../ui/select-2";
import { FieldInput } from "../ui/field-input";
import { Field, FieldError, FieldLabel } from "../ui/field";
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
  hideAddress?: boolean;
};

// ── Validation ────────────────────────────────────────────────────────────────

type FieldKey = keyof ShippingFormValues;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

function validate(
  values: ShippingFormValues,
  hideAddress: boolean
): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {};

  if (!values.firstName.trim()) e.firstName = "First name is required";
  if (!values.email.trim()) e.email = "Email is required";
  else if (!EMAIL_RE.test(values.email)) e.email = "Enter a valid email address";
  if (!values.phone.trim()) e.phone = "Phone number is required";
  else if (!PHONE_RE.test(values.phone)) e.phone = "Enter a valid phone number";

  if (!hideAddress) {
    if (!values.address1.trim()) e.address1 = "Street address is required";
    if (!values.city.trim()) e.city = "City is required";
    if (!values.country.trim()) e.country = "Please select a country";
  }

  return e;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShippingForm({ values, onChange, hideAddress = false }: Props) {
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

  const errors = validate(values, hideAddress);

  function touch(key: FieldKey) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  // Only surface an error once the field has been blurred
  function err(key: FieldKey): string | undefined {
    return touched[key] ? errors[key] : undefined;
  }

  function handleChange(key: FieldKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [key]: e.target.value } as Partial<ShippingFormValues>);
    };
  }

  function handleCountryChange(value: string) {
    const selected = COUNTRIES.find((c) => c.name === value);
    onChange({ country: value, countryCode: selected?.code ?? "RW" });
    touch("country");
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="First name" icon={<User />} required error={err("firstName")}>
          <FieldInput
            value={values.firstName}
            onChange={handleChange("firstName")}
            onBlur={() => touch("firstName")}
            placeholder="John"
            hasError={!!err("firstName")}
          />
        </Field>

        <Field label="Last name" icon={<User />}>
          <FieldInput
            value={values.lastName}
            onChange={handleChange("lastName")}
            onBlur={() => touch("lastName")}
            placeholder="Doe"
          />
        </Field>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Email" icon={<Mail />} required error={err("email")}>
          <FieldInput
            type="email"
            value={values.email}
            onChange={handleChange("email")}
            onBlur={() => touch("email")}
            placeholder="john@email.com"
            hasError={!!err("email")}
          />
        </Field>

        <Field label="Phone" icon={<Phone />} required error={err("phone")}>
          <FieldInput
            type="tel"
            value={values.phone}
            onChange={handleChange("phone")}
            onBlur={() => touch("phone")}
            placeholder="+250 700 000 000"
            hasError={!!err("phone")}
          />
        </Field>
      </div>

      {!hideAddress && (
        <>
          <Field label="Street address" icon={<MapPin />} required error={err("address1")}>
            <FieldInput
              value={values.address1}
              onChange={handleChange("address1")}
              onBlur={() => touch("address1")}
              placeholder="123 Main Street"
              hasError={!!err("address1")}
            />
          </Field>

          <Field label="Apartment / suite" icon={<Building2 />} hint="Optional">
            <FieldInput
              value={values.address2}
              onChange={handleChange("address2")}
              onBlur={() => touch("address2")}
              placeholder="Apt 4B"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Country uses CustomSelect — it has its own trigger, no icon wrapper needed */}
            <div>
              <FieldLabel label="Country" required />
              <CustomSelect
                value={values.country}
                options={COUNTRIES.map((c) => ({ label: c.name, value: c.name }))}
                onChange={handleCountryChange}
                searchable
                error={!!err("country")}
              />
              {err("country") && <FieldError message={err("country")!} />}
            </div>

            <Field label="City" icon={<MapPin />} required={!hideAddress} error={err("city")}>
              <FieldInput
                value={values.city}
                onChange={handleChange("city")}
                onBlur={() => touch("city")}
                placeholder="Kigali"
                hasError={!!err("city")}
              />
            </Field>
          </div>

          <Field label="ZIP / postal code" icon={<MapPin />}>
            <FieldInput
              value={values.zip}
              onChange={handleChange("zip")}
              onBlur={() => touch("zip")}
              placeholder="00000"
            />
          </Field>
        </>
      )}
    </div>
  );
}


