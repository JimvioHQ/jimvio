"use client";

// components/admin/verification-filters.tsx

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { OrderFilterToolbar, type FilterSelectGroup } from "@/components/ui/admin";
import type { SelectOption } from "@/components/ui/select-2";

const SORT_OPTIONS: SelectOption<string>[] = [
    { value: "oldest", label: "Oldest first" },
    { value: "newest", label: "Newest first" },
    { value: "name",   label: "Name A–Z" },
];

const AGE_OPTIONS: SelectOption<string>[] = [
    { value: "",   label: "All ages" },
    { value: "3",  label: "3+ days" },
    { value: "7",  label: "7+ days" },
    { value: "14", label: "14+ days" },
];

const DEFAULT_COUNTRIES: SelectOption<string>[] = [
    { value: "",   label: "All countries" },
    { value: "RW", label: "Rwanda" },
    { value: "KE", label: "Kenya" },
    { value: "UG", label: "Uganda" },
    { value: "TZ", label: "Tanzania" },
    { value: "NG", label: "Nigeria" },
    { value: "GH", label: "Ghana" },
    { value: "ZA", label: "South Africa" },
    { value: "US", label: "United States" },
    { value: "GB", label: "United Kingdom" },
];

export function VerificationFilters({
    q: initialQ,
    country,
    sort,
    age,
    countries = [],
}: {
    q: string;
    country: string;
    sort: string;
    age: string;
    countries?: string[];
}) {
    const router   = useRouter();
    const pathname = usePathname();
    const sp       = useSearchParams();

    const [q,          setQ         ] = useState(initialQ);
    const [sortVal,    setSortVal   ] = useState(sort);
    const [countryVal, setCountryVal] = useState(country);
    const [ageVal,     setAgeVal    ] = useState(age);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function pushParams(updates: Record<string, string>) {
        const params = new URLSearchParams(sp);
        for (const [k, v] of Object.entries(updates)) {
            if (v) params.set(k, v);
            else   params.delete(k);
        }
        router.push(`${pathname}?${params.toString()}`);
    }

    // Debounce search
    useEffect(() => {
        if (q === initialQ) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => pushParams({ q }), 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const countryOptions: SelectOption<string>[] = countries.length > 0
        ? [{ value: "", label: "All countries" }, ...countries.map((c) => ({ value: c, label: c }))]
        : DEFAULT_COUNTRIES;

    const showCountry  = countryOptions.length > 1;
    const showAge      = true;

    const filterGroups: FilterSelectGroup[] = [
        ...(showCountry ? [{
            key:      "country",
            label:    "Country",
            options:  countryOptions,
            value:    countryVal,
            onChange: (v: string) => { setCountryVal(v); pushParams({ country: v }); },
            minWidth: "150px",
        }] : []),
        {
            key:      "age",
            label:    "Waiting",
            options:  AGE_OPTIONS,
            value:    ageVal,
            onChange: (v: string) => { setAgeVal(v); pushParams({ age: v }); },
            minWidth: "130px",
        },
        {
            key:      "sort",
            label:    "Sort",
            options:  SORT_OPTIONS,
            value:    sortVal,
            onChange: (v: string) => { setSortVal(v); pushParams({ sort: v === "oldest" ? "" : v }); },
            minWidth: "145px",
        },
    ];

    const isDirty = !!(q || countryVal || ageVal) || sortVal !== "oldest";

    function handleReset() {
        setQ(""); setSortVal("oldest"); setCountryVal(""); setAgeVal("");
        const params = new URLSearchParams(sp);
        params.delete("q"); params.delete("country"); params.delete("age"); params.delete("sort");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <OrderFilterToolbar
            search={q}
            onSearchChange={setQ}
            onSearchSubmit={() => pushParams({ q })}
            filterGroups={filterGroups}
            defaultValues={{ country: "", age: "", sort: "oldest" }}
            onReset={isDirty ? handleReset : undefined}
            searchPlaceholder="Search by name or email…"
        />
    );
}