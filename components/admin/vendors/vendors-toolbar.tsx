"use client";

// components/admin/vendors/vendors-toolbar.tsx
// Replaces the inline <form> search + SortSelect with the shared OrderFilterToolbar.

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OrderFilterToolbar, type FilterSelectGroup } from "@/components/ui/admin";
import type { SelectOption } from "@/components/ui/select-2";

const SORT_OPTIONS: SelectOption<string>[] = [
    { value: "created_at", label: "Newest first" },
    { value: "revenue", label: "Revenue ↓" },
    { value: "sales", label: "Sales ↓" },
    { value: "rating", label: "Rating ↓" },
    { value: "followers", label: "Followers ↓" },
    { value: "products", label: "Products ↓" },
];

interface Props {
    initialQ: string;
    initialSort: string;
    status: string;
}

export function VendorsToolbar({ initialQ, initialSort, status }: Props) {
    const router = useRouter();
    const [search, setSearch] = useState(initialQ);
    const [sort, setSort] = useState(initialSort);
    const [, startTransition] = useTransition();

    const push = useCallback((q: string, s: string) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status !== "all") params.set("status", status);
        if (s !== "created_at") params.set("sort", s);
        startTransition(() => router.push(`/admin/vendors?${params.toString()}`));
    }, [router, status]);

    const filterGroups: FilterSelectGroup[] = [
        {
            key: "sort",
            label: "Sort by",
            options: SORT_OPTIONS,
            value: sort,
            onChange: (v) => { setSort(v); push(search, v); },
            minWidth: "160px",
        },
    ];

    return (
        <OrderFilterToolbar
            search={search}
            onSearchChange={setSearch}
            onSearchSubmit={() => push(search, sort)}
            filterGroups={filterGroups}
            defaultValues={{ sort: "created_at" }}
            onReset={() => { setSearch(""); setSort("created_at"); push("", "created_at"); }}
            searchPlaceholder="Search by name or email…"
        />
    );
}