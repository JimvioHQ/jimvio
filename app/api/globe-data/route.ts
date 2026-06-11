import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Load country centroids at runtime from restcountries and cache them in-memory
const countryCoordsCache = new Map<string, { lat: number; lng: number; name: string }>();

async function loadCountryCoordsOnce() {
  if (countryCoordsCache.size > 0) return;
  try {
    const res = await fetch("https://restcountries.com/v3.1/all?fields=cca2,name,latlng");
    if (!res.ok) return;
    const data = await res.json();
    for (const c of data) {
      const code = (c.cca2 || "").toUpperCase();
      const name = (c.name && (c.name.common || c.name)) || code;
      const latlng = Array.isArray(c.latlng) && c.latlng.length >= 2 ? c.latlng : null;
      if (code && latlng) {
        countryCoordsCache.set(code, { lat: latlng[0], lng: latlng[1], name });
      }
    }
  } catch (e) {
    // ignore — we'll fall back to geocoding where possible
  }
}

// Simple in-memory cache for geocoding results during a single request
const geocodeCache = new Map<string, { lat: number; lng: number }>();

async function geocodeCity(city: string, country?: string) {
  const key = `${city.toLowerCase().trim()}|${(country || "").toLowerCase().trim()}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  try {
    // Use Nominatim for open geocoding; limit results to 1
    const q = encodeURIComponent(city + (country ? `, ${country}` : ""));
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1` , {
      headers: { "User-Agent": "Jimvio-Globe/1.0 (+https://jimvio.example)" },
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        geocodeCache.set(key, { lat, lng });
        return { lat, lng };
      }
    }
  } catch (e) {
    // ignore and fall back
  }
  return null;
}

// Batch geocode with limited concurrency to avoid sequential waits
async function geocodeMany(items: Array<{ city: string; country?: string }>, concurrency = 6) {
  const toProcess = items.filter((it) => {
    const key = `${it.city.toLowerCase().trim()}|${(it.country || "").toLowerCase().trim()}`;
    return !geocodeCache.has(key);
  });
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const chunk = toProcess.slice(i, i + concurrency);
    await Promise.all(chunk.map((it) => geocodeCity(it.city, it.country)));
  }
}

// ── Notification type → Globe card config ──────────────────────────────────
const NOTIF_CONFIG: Record<string, { iconEmoji: string; iconBg: string; eventLabel: string }> = {
  payment:    { iconEmoji: "💰", iconBg: "#fef3c7", eventLabel: "Payment Received" },
  affiliate:  { iconEmoji: "🔗", iconBg: "#dbeafe", eventLabel: "Commission Earned" },
  order:      { iconEmoji: "🛒", iconBg: "#ffedd5", eventLabel: "Product Sale" },
  influencer: { iconEmoji: "🎬", iconBg: "#f3e8ff", eventLabel: "UGC Campaign" },
  community:  { iconEmoji: "👥", iconBg: "#fce7f3", eventLabel: "Community Join" },
  system:     { iconEmoji: "📘", iconBg: "#dcfce7", eventLabel: "Activity" },
  review:     { iconEmoji: "⭐", iconBg: "#fef9c3", eventLabel: "Review Posted" },
  message:    { iconEmoji: "💬", iconBg: "#e0f2fe", eventLabel: "Message" },
};

export interface GlobeEvent {
  id: string;
  iconEmoji: string;
  iconBg: string;
  event: string;
  city: string;
  country: string;
  amount?: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface GlobeStats {
  totalUsers: number;
  totalOrders: number;
  activeCountries: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    // Ensure we have country centroids available (cached after first load)
    await loadCountryCoordsOnce();

    // Fetch recent notifications (most recent 20 cross-platform events)
    // Joined with profile country/city for location data
    const [notifsRes, profilesRes, ordersRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, message, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(20),

      supabase
        .from("profiles")
        .select("id, country, city, created_at")
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("orders")
        .select("id, total_amount, currency, shipping_address, created_at")
        .in("status", ["confirmed", "completed", "delivered", "processing"])
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const profiles = (profilesRes.data ?? []) as {
      id: string;
      country: string | null;
      city: string | null;
      created_at: string;
    }[];

    const ordersRaw = (ordersRes.data ?? []) as {
      id: string;
      total_amount: number;
      currency: string;
      shipping_address: Record<string, string> | null;
      created_at: string;
    }[];

    // Collect unique city/country pairs to geocode in batch (profiles + orders)
    const geoTargetsMap = new Map<string, { city: string; country?: string }>();
    for (const p of profiles) {
      if (p.city) {
        const key = `${p.city.toLowerCase().trim()}|${(p.country || "").toLowerCase().trim()}`;
        if (!geocodeCache.has(key)) geoTargetsMap.set(key, { city: p.city!, country: p.country ?? undefined });
      }
    }
    for (const o of ordersRaw) {
      const addr = o.shipping_address;
      if (!addr) continue;
      const city = (addr.city ?? addr.City ?? "").trim();
      const country = (addr.country ?? addr.Country ?? addr.country_code ?? "").trim();
      if (city) {
        const key = `${city.toLowerCase().trim()}|${(country || "").toLowerCase().trim()}`;
        if (!geocodeCache.has(key)) geoTargetsMap.set(key, { city, country: country || undefined });
      }
    }

    // Run batch geocoding to populate the geocodeCache before building locations
    if (geoTargetsMap.size > 0) {
      await geocodeMany(Array.from(geoTargetsMap.values()), 6);
    }

    // Build user_id → location map from profiles (use geocodeCache populated above)
    const userLocMap = new Map<string, { lat: number; lng: number; locationStr: string }>();
    for (const p of profiles) {
      let lat: number | null = null;
      let lng: number | null = null;
      let locationStr = "";

      if (p.city) {
        const key = `${p.city.toLowerCase().trim()}|${(p.country || "").toLowerCase().trim()}`;
        const g = geocodeCache.get(key);
        if (g) {
          lat = g.lat;
          lng = g.lng;
          locationStr = p.city;
        }
      }

      // Fall back to country centroid if geocoding failed
      if ((lat === null || lng === null) && p.country) {
        const iso = p.country.toUpperCase();
        const countryData = countryCoordsCache.get(iso);
        if (countryData) {
          lat = countryData.lat + (Math.random() - 0.5) * 2; // slight scatter
          lng = countryData.lng + (Math.random() - 0.5) * 2;
          locationStr = countryData.name;
        }
      }

      if (lat !== null && lng !== null) {
        userLocMap.set(p.id, { lat, lng, locationStr });
      }
    }

    // Count active countries from profiles
    const activeCountriesSet = new Set(
      profiles.map((p) => p.country).filter(Boolean)
    );

    // Build globe events from notifications
    const notifs = (notifsRes.data ?? []) as {
      id: string;
      type: string;
      title: string;
      message: string;
      created_at: string;
      user_id: string;
    }[];

    const globeEvents: GlobeEvent[] = [];

    for (const n of notifs) {
      const loc = userLocMap.get(n.user_id);
      if (!loc) continue;

      const cfg = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.system;

      // Try to extract amount from notification message
      const amountMatch = n.message.match(/\$[\d,]+(?:\.\d{1,2})?|[\d,]+\s*RWF|[\d,]+\s*USD/i);
      const amount = amountMatch ? amountMatch[0] : undefined;

      globeEvents.push({
        id: n.id,
        iconEmoji: cfg.iconEmoji,
        iconBg: cfg.iconBg,
        event: cfg.eventLabel,
        city: loc.locationStr,
        country: loc.locationStr,
        amount,
        lat: loc.lat,
        lng: loc.lng,
        createdAt: n.created_at,
      });
    }

    // Supplement with order events if we need more
    if (globeEvents.length < 6) {
      const orders = (ordersRes.data ?? []) as {
        id: string;
        total_amount: number;
        currency: string;
        shipping_address: Record<string, string> | null;
        created_at: string;
      }[];

      for (const o of orders) {
        if (globeEvents.length >= 10) break;

        let lat: number | null = null;
        let lng: number | null = null;
        let locationStr = "";

        if (o.shipping_address) {
          const addr = o.shipping_address;
          const city = addr.city ?? addr.City ?? "";
          const country = addr.country ?? addr.Country ?? addr.country_code ?? "";

            if (city) {
            // Try geocoding city first
            const geo = await geocodeCity(city, country || undefined);
            if (geo) {
              lat = geo.lat;
              lng = geo.lng;
              locationStr = city;
            }
          }

          if ((lat === null) && country) {
            const isoCode = country.length === 2 ? country.toUpperCase() : null;
            const countryData = isoCode ? countryCoordsCache.get(isoCode) : null;
            if (countryData) {
              lat = countryData.lat + (Math.random() - 0.5) * 2;
              lng = countryData.lng + (Math.random() - 0.5) * 2;
              locationStr = countryData.name;
            }
          }
        }

        if (lat !== null && lng !== null) {
          globeEvents.push({
            id: `order-${o.id}`,
            iconEmoji: "🛒",
            iconBg: "#ffedd5",
            event: "Product Sale",
            city: locationStr,
            country: locationStr,
            amount: `$${Number(o.total_amount).toFixed(0)}`,
            lat,
            lng,
            createdAt: o.created_at,
          });
        }
      }
    }

    // Stats
    const stats: GlobeStats = {
      totalUsers: profiles.length,
      totalOrders: (ordersRes.data ?? []).length,
      activeCountries: activeCountriesSet.size,
    };

    return NextResponse.json({
      events: globeEvents.slice(0, 10),
      stats,
    });
  } catch (err) {
    console.error("[globe-data] error:", err);
    return NextResponse.json({ events: [], stats: null }, { status: 200 });
  }
}
