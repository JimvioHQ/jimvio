"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoveProductDialog } from "@/components/admin/MoveProductDialog";
import { BulkPublishDialog, type BulkPublishProduct } from "@/components/admin/products/bulk-publish-dialog";
import { EmptyState, Th, StatusPill } from "@/components/ui/admin";
import { formatAdminMoney } from "@/lib/admin/format-money";
import { publishAdminProduct } from "@/lib/actions/admin-products";
import { appConfirm } from "@/lib/app-dialog";
import {  SquarePen, Trash2, ExternalLink, Star, ChevronLeft, ChevronRight, ChevronDown, AlertCircle, Eye, Rocket  } from "lucide-react"
import { VscPackage } from "react-icons/vsc";

const SOURCE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    cj: { label: "CJ", bg: "rgba(168,85,247,0.1)", text: "#9333ea" },
    shopify: { label: "Shopify", bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
    vendor: { label: "Vendor", bg: "rgba(99,102,241,0.08)", text: "#6366f1" },
};


function SourceBadge({ source }: { source?: string }) {
    if (!source) return null;
    const cfg = SOURCE_CONFIG[source];
    if (!cfg) return null;
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
            style={{ background: cfg.bg, color: cfg.text }}>
            {cfg.label}
        </span>
    );
}

function parseImages(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
        } catch {
            if (raw.startsWith("http")) return [raw];
        }
    }
    return [];
}

function ImageCell({ images, className }: { images: unknown; className?: string }) {
    const srcs = parseImages(images);
    if (srcs.length === 0) {
        return <div className={cn("w-full aspect-square rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center", className)}><VscPackage className="h-8 w-8 text-zinc-300" /></div>;
    }
    return (
        <div className={cn("relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800", className)}>
            <Image
                src={srcs[0]}
                alt="Product"
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                sizes="100px"
            />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
        active: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "Active" },
        draft: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-400", label: "Draft" },
        archived: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", label: "Archived" },
        pending_review: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Pending Review" },
        rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Rejected" },
    };
    const cfg = configs[status] || { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-400", label: status };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

import { cn } from "@/lib/utils";
import Image from "next/image";

export function AdminProductsTable() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sourceFilter, setSourceFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<keyof any>("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [bulkPublishDialogOpen, setBulkPublishDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    async function fetchProducts() {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                sortBy,
                sortOrder,
            });
            if (search) params.set("search", search);
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (sourceFilter !== "all") params.set("source", sourceFilter);

            const res = await fetch(`/api/admin/products?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setProducts(data.products || []);
            setTotal(data.total || 0);
        } catch (e) {
            toast.error("Failed to load products");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProducts();
    }, [page, pageSize, search, statusFilter, sourceFilter, sortBy, sortOrder]);

    const handleSort = (key: keyof any) => {
        if (sortBy === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        else { setSortBy(key); setSortOrder("asc"); }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === products.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(products.map((p) => p.id)));
    };

    async function handleDelete(id: string) {
        if (!await appConfirm("Delete product?", "This action cannot be undone.")) return;
        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Product deleted");
            fetchProducts();
        } catch { toast.error("Failed to delete"); }
    }

    async function handleBulkDelete() {
        if (!await appConfirm(`Delete ${selectedIds.size} products?`, "This action cannot be undone.")) return;
        try {
            await Promise.all([...selectedIds].map((id) => fetch(`/api/admin/products/${id}`, { method: "DELETE" })));
            toast.success(`${selectedIds.size} products deleted`);
            setSelectedIds(new Set());
            fetchProducts();
        } catch { toast.error("Bulk delete failed"); }
    }

    async function handleBulkPublish() {
        setBulkPublishDialogOpen(true);
    }

    async function handleMove() {
        setMoveDialogOpen(true);
    }

    async function handleStatusChange(id: string, newStatus: string) {
        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Status updated");
            fetchProducts();
        } catch { toast.error("Failed to update status"); }
    }

    async function handleInlineEditSave(id: string, field: string, value: string) {
        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Saved");
            setEditingId(null);
            fetchProducts();
        } catch { toast.error("Failed to save"); }
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex-1 min-w-[200px] max-w-md">
                    <input
                        type="search"
                        placeholder="Search products…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                        <option value="all">All Sources</option>
                        <option value="cj">CJ</option>
                        <option value="shopify">Shopify</option>
                        <option value="vendor">Vendor</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={handleBulkDelete} className="h-10 px-4 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-sm font-semibold hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors">Delete</button>
                            <button onClick={handleMove} className="h-10 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Move</button>
                            <button onClick={handleBulkPublish} className="h-10 px-4 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">Publish</button>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {loading && products.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center space-y-3">
                            <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto" />
                            <p className="text-zinc-500 dark:text-zinc-400">Loading products…</p>
                        </div>
                    </div>
                ) : products.length === 0 ? (
                    <EmptyState icon={<VscPackage className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />} title="No products found" description="Try adjusting your filters or add a new product." />
                ) : (
                    <table className="w-full border-collapse" role="grid">
                        <thead className="sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                <th className="w-12 px-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === products.length && products.length > 0}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                                        aria-label="Select all"
                                    />
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => handleSort("image")}>
                                    <div className="flex items-center gap-1">Image <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 min-w-[200px]" onClick={() => handleSort("name")}>
                                    <div className="flex items-center gap-1">Product <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => handleSort("status")}>
                                    <div className="flex items-center gap-1">Status <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => handleSort("source")}>
                                    <div className="flex items-center gap-1">Source <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => handleSort("price")}>
                                    <div className="flex items-center justify-end gap-1">Price <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => handleSort("stock")}>
                                    <div className="flex items-center justify-end gap-1">Stock <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => handleSort("sales_count")}>
                                    <div className="flex items-center justify-end gap-1">Sales <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => handleSort("created_at")}>
                                    <div className="flex items-center justify-end gap-1">Created <ChevronDown className="h-3 w-3" /></div>
                                </th>
                                <th className="w-28 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {products.map((product) => (
                                <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                    <td className="px-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(product.id)}
                                            onChange={() => toggleSelect(product.id)}
                                            className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        <ImageCell images={product.images} />
                                    </td>
                                    <td className="px-3 py-3 min-w-[200px]">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{product.name}</span>
                                            <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">#{product.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <StatusBadge status={product.status} />
                                    </td>
                                    <td className="px-3 py-3">
                                        <SourceBadge source={product.source} />
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100">
                                        {formatAdminMoney(product.price, product.currency || "USD")}
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100">
                                        {product.stock_quantity ?? "—"}
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100">
                                        {product.sales_count ?? 0}
                                    </td>
                                    <td className="px-3 py-3 text-right text-[12px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                        {product.created_at ? new Date(product.created_at).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => router.push(`/admin/products/${product.id}`)}
                                                className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                                aria-label="View product"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                                className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                                aria-label="Edit product"
                                            >
                                                <SquarePen className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                aria-label="Delete product"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                        disabled={page >= Math.ceil(total / pageSize)}
                        className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Move Dialog */}
            <MoveProductDialog
                open={moveDialogOpen}
                onClose={() => setMoveDialogOpen(false)}
                productIds={Array.from(selectedIds)}
                onSuccess={() => { setMoveDialogOpen(false); setSelectedIds(new Set()); fetchProducts(); }}
            />

            {/* Bulk Publish Dialog */}
            <BulkPublishDialog
                open={bulkPublishDialogOpen}
                onClose={() => setBulkPublishDialogOpen(false)}
                products={products.filter((p) => selectedIds.has(p.id)).map((p) => ({ id: p.id, name: p.name, status: p.status, price: p.price, currency: p.currency }))}
                onSuccess={() => { setBulkPublishDialogOpen(false); setSelectedIds(new Set()); fetchProducts(); }}
            />
        </div>
    );
}