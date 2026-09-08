"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Clapperboard,
  Heart,
  Loader2,
  Package,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toggleWishlist } from "@/lib/actions/marketplace";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabId = "all" | "products" | "posts" | "campaigns";

type WishlistRow = {
  id: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    currency?: string | null;
    images?: string[] | null;
  } | null;
};

type PostRow = {
  id: string;
  created_at: string;
  community_posts: {
    id: string;
    title: string | null;
    body: string | null;
    community_id?: string | null;
  } | null;
};

type CampaignSave = {
  id: string;
  campaign_id: string;
  created_at: string;
  campaign?: {
    id: string;
    title: string;
    status?: string;
    campaign_type?: string;
  } | null;
};

type UnifiedItem = {
  key: string;
  kind: "product" | "post" | "campaign";
  title: string;
  href: string;
  subtitle?: string;
  image?: string | null;
  createdAt: string;
  remove: () => Promise<void>;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "products", label: "Products" },
  { id: "posts", label: "Posts" },
  { id: "campaigns", label: "Campaigns" },
];

export function GlobalSavedPage() {
  const { formatMoney } = useCurrency();
  const [tab, setTab] = useState<TabId>("all");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<WishlistRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSave[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const supabase = createClient();
    try {
      const [wishRes, postRes, campRes] = await Promise.all([
        supabase
          .from("wishlists")
          .select(
            "id, created_at, products ( id, name, slug, price, currency, images )",
          )
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("community_saved_posts")
          .select(
            "id, created_at, community_posts ( id, title, body, community_id )",
          )
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(100),
        fetch("/api/ugc/saves", { cache: "no-store" }).then(async (r) => {
          if (!r.ok) return { data: [] as CampaignSave[] };
          const json = await r.json();
          return { data: (json.data ?? json.saves ?? []) as CampaignSave[] };
        }),
      ]);

      if (!wishRes.error) setWishlist((wishRes.data ?? []) as WishlistRow[]);
      else setWishlist([]);
      if (!postRes.error) setPosts((postRes.data ?? []) as PostRow[]);
      else setPosts([]);
      setCampaigns(campRes.data ?? []);
    } catch {
      toast.error("Could not load saved items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) void load(uid);
      else setLoading(false);
    });
  }, [load]);

  const items = useMemo((): UnifiedItem[] => {
    const productItems: UnifiedItem[] = wishlist
      .filter((w) => w.products)
      .map((w) => {
        const p = w.products!;
        const img = Array.isArray(p.images) ? p.images[0] : null;
        return {
          key: `product-${w.id}`,
          kind: "product" as const,
          title: p.name,
          href: `/marketplace/${p.slug || p.id}`,
          subtitle: formatMoney(Number(p.price ?? 0), p.currency ?? "USD"),
          image: img,
          createdAt: w.created_at,
          remove: async () => {
            const res = await toggleWishlist(p.id);
            if ((res as { error?: string })?.error) throw new Error("Failed");
            setWishlist((prev) => prev.filter((x) => x.id !== w.id));
          },
        };
      });

    const postItems: UnifiedItem[] = posts
      .filter((p) => p.community_posts)
      .map((p) => {
        const post = p.community_posts!;
        const title =
          post.title?.trim() ||
          (post.body ? post.body.slice(0, 80) : "Community post");
        return {
          key: `post-${p.id}`,
          kind: "post" as const,
          title,
          href: `/communities/bookmarks`,
          subtitle: "Community post",
          createdAt: p.created_at,
          remove: async () => {
            if (!userId) return;
            const supabase = createClient();
            const { error } = await supabase
              .from("community_saved_posts")
              .delete()
              .eq("id", p.id)
              .eq("user_id", userId);
            if (error) throw error;
            setPosts((prev) => prev.filter((x) => x.id !== p.id));
          },
        };
      });

    const campaignItems: UnifiedItem[] = campaigns.map((c) => ({
      key: `campaign-${c.id}`,
      kind: "campaign" as const,
      title: c.campaign?.title ?? "UGC campaign",
      href: `/ugc/${c.campaign_id}`,
      subtitle: c.campaign?.status
        ? `Campaign · ${c.campaign.status}`
        : "UGC campaign",
      createdAt: c.created_at,
      remove: async () => {
        const res = await fetch(
          `/api/ugc/saves?campaign_id=${encodeURIComponent(c.campaign_id)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to unsave");
        setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      },
    }));

    const all = [...productItems, ...postItems, ...campaignItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (tab === "products") return productItems;
    if (tab === "posts") return postItems;
    if (tab === "campaigns") return campaignItems;
    return all;
  }, [wishlist, posts, campaigns, tab, formatMoney, userId]);

  const counts = {
    all: wishlist.length + posts.length + campaigns.length,
    products: wishlist.length,
    posts: posts.length,
    campaigns: campaigns.length,
  };

  const onRemove = async (item: UnifiedItem) => {
    setBusyKey(item.key);
    try {
      await item.remove();
      toast.success("Removed from saved");
    } catch {
      toast.error("Could not remove item");
    } finally {
      setBusyKey(null);
    }
  };

  if (!userId && !loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Heart className="mx-auto h-10 w-10 text-[#fd5000]" />
        <h1 className="mt-4 text-2xl font-semibold text-stone-900">Saved Items</h1>
        <p className="mt-2 text-sm text-stone-500">
          Sign in to see products, posts, and campaigns you saved across Jimvio.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#fd5000] px-4 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-[#fd5000]" />
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Saved Items
          </h1>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Everything you saved across Marketplace, Communities, and UGC.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-stone-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors",
              tab === t.id
                ? "bg-[#fd5000]/10 text-[#fd5000]"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
            )}
          >
            {t.label}
            <span className="tabular-nums text-[11px] opacity-70">
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#fd5000]" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 px-6 py-16 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm font-medium text-stone-700">Nothing saved yet</p>
          <p className="mt-1 text-xs text-stone-500">
            Save marketplace products, community posts, or UGC campaigns to find them here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/marketplace"
              className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/communities"
              className="rounded-lg ring-1 ring-stone-200 px-3 py-2 text-xs font-semibold text-stone-700"
            >
              Communities
            </Link>
            <Link
              href="/ugc"
              className="rounded-lg ring-1 ring-stone-200 px-3 py-2 text-xs font-semibold text-stone-700"
            >
              UGC & Clipping
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <div className="group flex items-center gap-3 rounded-xl border border-stone-150 border-stone-200 bg-white p-3 transition-colors hover:border-stone-300">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-50 ring-1 ring-stone-100">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : item.kind === "product" ? (
                    <Package className="h-5 w-5 text-stone-400" />
                  ) : item.kind === "campaign" ? (
                    <Clapperboard className="h-5 w-5 text-stone-400" />
                  ) : (
                    <Bookmark className="h-5 w-5 text-stone-400" />
                  )}
                </div>
                <Link href={item.href} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <p className="truncate text-xs text-stone-500">{item.subtitle}</p>
                  ) : null}
                </Link>
                <button
                  type="button"
                  aria-label="Remove from saved"
                  disabled={busyKey === item.key}
                  onClick={() => void onRemove(item)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-stone-400 opacity-70 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:opacity-40"
                >
                  {busyKey === item.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
