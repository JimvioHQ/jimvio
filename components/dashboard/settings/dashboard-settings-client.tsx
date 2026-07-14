"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  User,
  Store,
  Bell,
  Shield,
  Camera,
  Globe,
  Mail,
  Loader2,
  AlertCircle,
  Link2,
  Video,
  Sparkles,
  Download,
  Trash2,
  Plug,
  Image as ImageIcon,
  Settings,
  CreditCard,
} from "lucide-react";
import { StyledTextarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { normalizeVendorPayoutMethod } from "@/lib/payout-method";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { CloudinaryAvatar, CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import CustomSelect from "@/components/ui/select-2";
import {
  BrandBtn,
  Grid,
  Toast,
  Toggle,
  type ToastMsg,
} from "@/components/admin/form-primitive";
import {
  activateUserRole,
  deactivateAccount,
  exportUserData,
  requestEmailChange,
  saveAffiliateSettings,
  saveInfluencerSettings,
  saveUserPreferences,
  saveVendorPolicies,
  type VendorPolicies,
} from "@/lib/actions/account-settings";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/config";

export const dynamic = "force-dynamic";

type FieldError = string | null;

const validators = {
  required: (v: string, label = "This field") =>
    v.trim() ? null : `${label} is required`,
  minLength: (v: string, min: number, label = "This field") =>
    v.trim().length >= min ? null : `${label} must be at least ${min} characters`,
  maxLength: (v: string, max: number, label = "This field") =>
    v.trim().length <= max ? null : `${label} must be under ${max} characters`,
  email: (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address",
  url: (v: string) =>
    !v || /^https?:\/\/.+/.test(v.trim()) ? null : "URL must start with https://",
  phone: (v: string) =>
    !v || /^\+?[\d\s\-()]{7,20}$/.test(v.trim()) ? null : "Enter a valid phone number",
  username: (v: string) =>
    !v || /^[a-z0-9_]{3,30}$/.test(v.trim())
      ? null
      : "Username: 3–30 chars, lowercase letters, numbers, underscores only",
  commission: (v: string) => {
    const n = parseFloat(v);
    return n >= 1 && n <= 100 ? null : "Commission must be between 1% and 100%";
  },
};

function validateProfile(p: typeof defaultProfile) {
  return {
    full_name:
      validators.required(p.full_name, "Full name") ??
      validators.maxLength(p.full_name, 80, "Full name"),
    username: validators.username(p.username),
    bio: validators.maxLength(p.bio, 300, "Bio"),
    website: validators.url(p.website),
    phone: validators.phone(p.phone),
  };
}

function validateVendor(v: NonNullable<typeof defaultVendor>) {
  return {
    business_name:
      validators.required(v.business_name, "Store name") ??
      validators.maxLength(v.business_name, 80, "Store name"),
    business_email:
      validators.required(v.business_email, "Support email") ??
      validators.email(v.business_email),
    business_description: validators.maxLength(v.business_description, 500, "Description"),
    payout_account: validators.required(v.payout_account, "Account number"),
    affiliate_commission_rate: v.affiliate_enabled
      ? validators.commission(v.affiliate_commission_rate)
      : null,
  };
}

const defaultProfile = {
  full_name: "",
  username: "",
  avatar_url: "",
  bio: "",
  website: "",
  phone: "",
  city: "",
  country: "RW",
  language: "en",
  timezone: "Africa/Kigali",
};

const defaultVendor = {
  id: "",
  business_name: "",
  business_description: "",
  business_email: "",
  business_logo: "",
  business_banner: "",
  business_phone: "",
  business_address: "",
  business_country: "RW",
  tax_id: "",
  website: "",
  payout_method: "bank",
  payout_account: "",
  affiliate_enabled: true,
  affiliate_commission_rate: "10",
};

const defaultAffiliate = {
  id: "",
  bio: "",
  website: "",
  payout_method: "bank",
  payout_account: "",
  niche: "",
};

const defaultInfluencer = {
  id: "",
  display_name: "",
  bio: "",
  niche: "",
  social_platforms: "{}",
};

type TabCondition = "vendor" | "hasAffiliate" | "hasInfluencer";

type TabConfig = {
  value: string;
  label: string;
  icon: typeof User;
  always?: boolean;
  condition?: TabCondition;
};

const TABS_CONFIG: TabConfig[] = [
  { value: "profile", label: "Profile", icon: User, always: true },
  { value: "vendor", label: "Business", icon: Store, condition: "vendor" },
  { value: "preferences", label: "Preferences", icon: Settings, always: true },
  { value: "roles", label: "Roles", icon: Sparkles, always: true },
  { value: "affiliate", label: "Affiliate", icon: Link2, condition: "hasAffiliate" },
  { value: "creator", label: "Creator", icon: Video, condition: "hasInfluencer" },
  { value: "notifications", label: "Notifications", icon: Bell, always: true },
  { value: "privacy", label: "Privacy", icon: Shield, always: true },
];

const tabTriggerClass =
  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium shadow-none transition-all " +
  "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]/60 hover:text-[var(--color-text-primary)] " +
  "data-[state=active]:border-[var(--color-accent)] data-[state=active]:bg-[var(--color-accent-light)]/40 data-[state=active]:text-[var(--color-text-primary)]";

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const pct = len / max;
  return (
    <span
      className={cn(
        "text-[10px] tabular-nums",
        pct > 0.9
          ? "text-[var(--color-danger)]"
          : pct > 0.7
            ? "text-[var(--color-warning)]"
            : "text-[var(--color-text-muted)]",
      )}
    >
      {len}/{max}
    </span>
  );
}

function ValidationBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-4 py-3 text-[12px] font-medium"
      style={{
        background: "var(--color-danger-light)",
        color: "var(--color-danger)",
        border: "1px solid var(--color-danger)",
      }}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function SaveRow({
  hint,
  onSave,
  pending,
  label,
}: {
  hint?: string;
  onSave: () => void;
  pending: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
      {hint ? (
        <p className="text-[12px] text-[var(--color-text-muted)]">{hint}</p>
      ) : (
        <span />
      )}
      <BrandBtn onClick={onSave} disabled={pending} loading={pending}>
        {label}
      </BrandBtn>
    </div>
  );
}

function SectionCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
        {icon && <span className="text-[var(--color-accent)]">{icon}</span>}
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldWithError({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: FieldError;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Field label={label} hint={hint} required={required} error={error}>
      {children}
    </Field>
  );
}

export default function DashboardSettingsClient() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [activeRoles, setActiveRoles] = useState<string[]>([]);

  const [profile, setProfile] = useState(defaultProfile);
  const [profileErrors, setProfileErrors] = useState<Record<string, FieldError>>({});
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});

  const [vendor, setVendor] = useState<typeof defaultVendor | null>(null);
  const [vendorErrors, setVendorErrors] = useState<Record<string, FieldError>>({});
  const [vendorTouched, setVendorTouched] = useState<Record<string, boolean>>({});
  const [vendorPolicies, setVendorPolicies] = useState<VendorPolicies>({
    shipping_policy: "",
    return_policy: "",
  });

  const [affiliate, setAffiliate] = useState<typeof defaultAffiliate | null>(null);
  const [influencer, setInfluencer] = useState<typeof defaultInfluencer | null>(null);

  const [notifications, setNotifications] = useState({
    new_sales: true,
    affiliate_activity: true,
    withdrawals: false,
    system_updates: true,
    messages: true,
    marketing: false,
  });

  const [activeTab, setActiveTab] = useState("profile");

  const showToast = (msg: string, type: "ok" | "err") => setToast({ msg, type });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      setPreferredCurrency(
        (user.user_metadata?.preferred_currency as string) || "USD"
      );

      const prefs = user.user_metadata?.notification_preferences;
      if (prefs && typeof prefs === "object") {
        setNotifications((n) => ({ ...n, ...prefs }));
      }
      const policies = user.user_metadata?.vendor_policies;
      if (policies && typeof policies === "object") {
        setVendorPolicies({
          shipping_policy: String(policies.shipping_policy ?? ""),
          return_policy: String(policies.return_policy ?? ""),
        });
      }

      const [profRes, vendRes, affRes, infRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("vendors").select("*").eq("user_id", user.id).single(),
        supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("influencers").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role, is_active").eq("user_id", user.id),
      ]);

      if (profRes.data) {
        setProfile({
          full_name: profRes.data.full_name ?? "",
          username: profRes.data.username ?? "",
          avatar_url: profRes.data.avatar_url ?? "",
          bio: profRes.data.bio ?? "",
          website: profRes.data.website ?? "",
          phone: profRes.data.phone ?? "",
          city: profRes.data.city ?? "",
          country: profRes.data.country ?? "RW",
          language: profRes.data.language ?? "en",
          timezone: profRes.data.timezone ?? "Africa/Kigali",
        });
      }

      if (vendRes.data) {
        setVendor({
          id: vendRes.data.id,
          business_name: vendRes.data.business_name ?? "",
          business_description: vendRes.data.business_description ?? "",
          business_logo: vendRes.data.business_logo ?? "",
          business_banner: vendRes.data.business_banner ?? "",
          business_email: vendRes.data.business_email ?? "",
          business_phone: vendRes.data.business_phone ?? "",
          business_address: vendRes.data.business_address ?? "",
          business_country: vendRes.data.business_country ?? "RW",
          tax_id: vendRes.data.tax_id ?? "",
          website: vendRes.data.website ?? "",
          payout_method: normalizeVendorPayoutMethod(vendRes.data.payout_method),
          payout_account: vendRes.data.payout_account ?? "",
          affiliate_enabled: vendRes.data.affiliate_enabled ?? true,
          affiliate_commission_rate: String(vendRes.data.affiliate_commission_rate ?? 10),
        });
      }

      if (affRes.data) {
        setAffiliate({
          id: affRes.data.id,
          bio: affRes.data.bio ?? "",
          website: affRes.data.website ?? "",
          payout_method: affRes.data.payout_method ?? "bank",
          payout_account: affRes.data.payout_account ?? "",
          niche: Array.isArray(affRes.data.niche) ? affRes.data.niche.join(", ") : "",
        });
      }

      if (infRes.data) {
        setInfluencer({
          id: infRes.data.id,
          display_name: infRes.data.display_name ?? "",
          bio: infRes.data.bio ?? "",
          niche: Array.isArray(infRes.data.niche) ? infRes.data.niche.join(", ") : "",
          social_platforms: infRes.data.social_platforms
            ? JSON.stringify(infRes.data.social_platforms, null, 2)
            : "{}",
        });
      }

      setActiveRoles(
        (rolesRes.data ?? [])
          .filter((r: { is_active: boolean | null; role: string }) => r.is_active)
          .map((r: { role: string }) => r.role)
      );

      setLoading(false);
    }
    load();
  }, []);

  const touchProfile = (field: string) =>
    setProfileTouched((t) => ({ ...t, [field]: true }));

  const updateProfile = (field: keyof typeof defaultProfile, value: string) => {
    const next = { ...profile, [field]: value };
    setProfile(next);
    const errs = validateProfile(next);
    setProfileErrors((e) => ({
      ...e,
      [field]: errs[field as keyof typeof errs] ?? null,
    }));
  };

  function saveProfile() {
    const errs = validateProfile(profile);
    setProfileErrors(errs);
    setProfileTouched({
      full_name: true,
      username: true,
      bio: true,
      website: true,
      phone: true,
    });
    if (Object.values(errs).some(Boolean) || !userId) return;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: profile.full_name,
            username: profile.username || null,
            avatar_url: profile.avatar_url || null,
            bio: profile.bio || null,
            website: profile.website || null,
            phone: profile.phone || null,
            city: profile.city || null,
            country: profile.country,
            language: profile.language || "en",
            timezone: profile.timezone || "Africa/Kigali",
          })
          .eq("id", userId);
        if (error) throw error;
        showToast("Profile updated", "ok");
      } catch {
        showToast("Failed to save profile. Please try again.", "err");
      }
    });
  }

  function savePreferences() {
    startTransition(async () => {
      const r = await saveUserPreferences({
        language: profile.language,
        timezone: profile.timezone,
        preferred_currency: preferredCurrency,
      });
      if (!r.success) showToast(r.error, "err");
      else showToast("Preferences saved", "ok");
    });
  }

  function handleEmailChange() {
    startTransition(async () => {
      const r = await requestEmailChange(newEmail);
      if (!r.success) showToast(r.error, "err");
      else {
        showToast(r.data?.message ?? "Confirmation email sent", "ok");
        setNewEmail("");
      }
    });
  }

  const touchVendor = (field: string) =>
    setVendorTouched((t) => ({ ...t, [field]: true }));

  const updateVendor = (field: string, value: string | boolean) => {
    const next = { ...vendor!, [field]: value };
    setVendor(next);
    const errs = validateVendor(next);
    setVendorErrors((e) => ({
      ...e,
      [field]: errs[field as keyof typeof errs] ?? null,
    }));
  };

  function saveVendor() {
    if (!vendor) return;
    const errs = validateVendor(vendor);
    setVendorErrors(errs);
    setVendorTouched({
      business_name: true,
      business_email: true,
      business_description: true,
      payout_account: true,
      affiliate_commission_rate: true,
    });
    if (Object.values(errs).some(Boolean)) return;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("vendors")
          .update({
            business_name: vendor.business_name,
            business_description: vendor.business_description || null,
            business_logo: vendor.business_logo || null,
            business_banner: vendor.business_banner || null,
            business_email: vendor.business_email,
            business_phone: vendor.business_phone || null,
            business_address: vendor.business_address || null,
            business_country: vendor.business_country || null,
            tax_id: vendor.tax_id || null,
            website: vendor.website || null,
            payout_method: vendor.payout_method,
            payout_account: vendor.payout_account,
            affiliate_enabled: vendor.affiliate_enabled,
            affiliate_commission_rate:
              parseFloat(vendor.affiliate_commission_rate) || 10,
          })
          .eq("id", vendor.id);
        if (error) throw error;
        const pol = await saveVendorPolicies(vendorPolicies);
        if (!pol.success) showToast(pol.error, "err");
        else showToast("Business settings saved", "ok");
      } catch {
        showToast("Failed to save business settings.", "err");
      }
    });
  }

  function saveNotifications() {
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
          data: { notification_preferences: notifications },
        });
        if (error) throw error;
        showToast("Notification preferences saved", "ok");
      } catch {
        showToast("Failed to save notification preferences.", "err");
      }
    });
  }

  function saveAffiliate() {
    if (!affiliate) return;
    startTransition(async () => {
      const r = await saveAffiliateSettings({
        bio: affiliate.bio,
        website: affiliate.website,
        payout_method: affiliate.payout_method,
        payout_account: affiliate.payout_account,
        niche: affiliate.niche,
      });
      if (!r.success) showToast(r.error, "err");
      else showToast("Affiliate settings saved", "ok");
    });
  }

  function saveInfluencer() {
    if (!influencer) return;
    startTransition(async () => {
      const r = await saveInfluencerSettings({
        display_name: influencer.display_name,
        bio: influencer.bio,
        niche: influencer.niche,
        social_platforms: influencer.social_platforms,
      });
      if (!r.success) showToast(r.error, "err");
      else showToast("Creator settings saved", "ok");
    });
  }

  function handleExportData() {
    startTransition(async () => {
      const r = await exportUserData();
      if (!r.success) {
        showToast(r.error ?? "Export failed", "err");
        return;
      }
      if (!r.data?.json) {
        showToast("Export failed", "err");
        return;
      }
      const blob = new Blob([r.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jimvio-data-${userId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data export downloaded", "ok");
    });
  }

  function handleDeactivate() {
    if (!confirm("Deactivate your account? You will lose dashboard access until support restores it.")) {
      return;
    }
    startTransition(async () => {
      const r = await deactivateAccount();
      if (!r.success) showToast(r.error, "err");
      else showToast("Account deactivated", "ok");
    });
  }

  function handleActivateRole(role: "affiliate" | "influencer") {
    startTransition(async () => {
      const r = await activateUserRole(role);
      if (!r.success) showToast(r.error, "err");
      else {
        setActiveRoles((prev) => [...new Set([...prev, role])]);
        showToast(`${role === "affiliate" ? "Affiliate" : "Creator"} role activated`, "ok");
        window.location.reload();
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading settings…</p>
      </div>
    );
  }

  const profileErrs = validateProfile(profile);
  const vendorErrs = vendor ? validateVendor(vendor) : {};
  const profileHasErrors = Object.keys(profileErrs)
    .filter((k) => profileTouched[k])
    .some((k) => profileErrs[k as keyof typeof profileErrs]);
  const vendorHasErrors = Object.keys(vendorErrs)
    .filter((k) => vendorTouched[k])
    .some((k) => vendorErrs[k as keyof typeof vendorErrs]);

  const hasAffiliate = Boolean(affiliate) || activeRoles.includes("affiliate");
  const hasInfluencer = Boolean(influencer) || activeRoles.includes("influencer");

  const visibleTabs = TABS_CONFIG.filter((tab) => {
    if (tab.always) return true;
    if (tab.condition === "vendor") return Boolean(vendor);
    if (tab.condition === "hasAffiliate") return hasAffiliate;
    if (tab.condition === "hasInfluencer") return hasInfluencer;
    return false;
  });

  return (
    <>
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-transparent overflow-hidden">
            <div className="px-4 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Settings
              </p>
            </div>
            <nav className="p-2 space-y-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    activeTab === tab.value
                      ? "bg-[var(--color-accent-light)]/40 text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <tab.icon className="size-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
              <hr className="my-2 border-[var(--color-border)]/60" />
              <Link
                href="/dashboard/security"
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-all hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <Shield className="size-4" />
                Security
              </Link>
            </nav>
          </div>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="h-auto flex-1 justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0 scrollbar-none">
              {visibleTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className={tabTriggerClass}>
                  <tab.icon className="size-4 shrink-0" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Content Panel */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsContent value="profile" className="mt-0 space-y-6">
            {/* Avatar & Identity */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[var(--color-surface-secondary)]/40 p-4">
              <div className="group relative">
                <div className="h-16 w-16 overflow-hidden rounded-full">
                  <CloudinaryAvatar
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    size={64}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <CloudinaryUploadButton
                    folder="jimvio/avatars"
                    onUploadSuccess={(url) =>
                      setProfile((p) => ({ ...p, avatar_url: url }))
                    }
                    buttonText=""
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {profile.full_name || "New member"}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  @{profile.username || "unset"} · {userEmail}
                </p>
              </div>
            </div>

            <SectionCard title="Identity" icon={<User className="size-4" />}>
              <Grid cols={2}>
                <FieldWithError
                  label="Full name"
                  error={profileErrors.full_name ?? ""}
                  required
                >
                  <FieldInput
                    value={profile.full_name}
                    onChange={(e) => updateProfile("full_name", e.target.value)}
                    onBlur={() => touchProfile("full_name")}
                    placeholder="Jane Doe"
                    hasError={!!profileErrors.full_name}
                  />
                </FieldWithError>
                <FieldWithError
                  label="Username"
                  error={profileErrors.username ?? ""}
                  hint="optional"
                >
                  <FieldInput
                    value={profile.username}
                    onChange={(e) =>
                      updateProfile("username", e.target.value.toLowerCase())
                    }
                    onBlur={() => touchProfile("username")}
                    placeholder="jane_doe"
                    hasError={!!profileErrors.username}
                  />
                </FieldWithError>
              </Grid>

              <FieldWithError label="Bio" error={profileErrors.bio ?? ""} hint="optional">
                <div className="relative">
                  <StyledTextarea
                    value={profile.bio}
                    onChange={(e) => updateProfile("bio", e.target.value)}
                    onBlur={() => touchProfile("bio")}
                    placeholder="Tell us about yourself…"
                    maxLength={300}
                    error={profileTouched.bio ? profileErrors.bio : null}
                  />
                  <div className="absolute bottom-2.5 right-3">
                    <CharCount value={profile.bio} max={300} />
                  </div>
                </div>
              </FieldWithError>

              <Grid cols={2}>
                <FieldWithError
                  label="Website"
                  error={profileErrors.website ?? ""}
                  hint="optional"
                >
                  <FieldInput
                    value={profile.website}
                    onChange={(e) => updateProfile("website", e.target.value)}
                    onBlur={() => touchProfile("website")}
                    placeholder="https://yoursite.com"
                    hasError={!!profileErrors.website}
                  />
                </FieldWithError>
                <FieldWithError
                  label="Phone"
                  error={profileErrors.phone ?? ""}
                  hint="optional"
                >
                  <FieldInput
                    value={profile.phone}
                    onChange={(e) => updateProfile("phone", e.target.value)}
                    onBlur={() => touchProfile("phone")}
                    placeholder="+250 7XX XXX XXX"
                    hasError={!!profileErrors.phone}
                  />
                </FieldWithError>
                <FieldWithError label="City" hint="optional">
                  <FieldInput
                    value={profile.city}
                    onChange={(e) => updateProfile("city", e.target.value)}
                    placeholder="Kigali"
                  />
                </FieldWithError>
                <FieldWithError label="Country">
                  <FieldInput
                    value={profile.country}
                    onChange={(e) => updateProfile("country", e.target.value.toUpperCase())}
                    placeholder="RW"
                  />
                </FieldWithError>
              </Grid>
            </SectionCard>

            <SectionCard title="Change email" icon={<Mail className="size-4" />}>
              <Grid cols={2}>
                <FieldWithError label="New email address" required>
                  <FieldInput
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@email.com"
                  />
                </FieldWithError>
                <div className="flex items-end">
                  <BrandBtn onClick={handleEmailChange} disabled={isPending || !newEmail.trim()}>
                    Send confirmation
                  </BrandBtn>
                </div>
              </Grid>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                We&apos;ll email a confirmation link to the new address before it takes effect.
              </p>
            </SectionCard>

            {profileHasErrors ? (
              <ValidationBanner message="Please fix the errors above before saving." />
            ) : null}

            <SaveRow onSave={saveProfile} pending={isPending} label="Save profile" />
          </TabsContent>

          {/* Vendor tab */}
          {vendor ? (
            <TabsContent value="vendor" className="mt-0 space-y-6">
              {/* Store Header with Banner */}
              <div className="relative h-28 overflow-hidden rounded-xl ring-1 ring-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                {vendor.business_banner ? (
                  <CloudinaryImage
                    src={vendor.business_banner}
                    alt="Store banner"
                    fill
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                  <CloudinaryUploadButton
                    folder="jimvio/banners"
                    onUploadSuccess={(url) =>
                      setVendor((v) => (v ? { ...v, business_banner: url } : null))
                    }
                    buttonText="Upload banner"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[var(--color-surface-secondary)]/40 p-4 ring-1 ring-[var(--color-border)]">
                <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-[var(--color-border)]">
                  {vendor.business_logo ? (
                    <CloudinaryImage
                      src={vendor.business_logo}
                      alt={vendor.business_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-7 w-7 text-[var(--color-text-muted)]" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <CloudinaryUploadButton
                      folder="jimvio/vendor-logos"
                      onUploadSuccess={(url) =>
                        setVendor((v) => (v ? { ...v, business_logo: url } : null))
                      }
                      buttonText=""
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-[15px] font-semibold">{vendor.business_name || "New store"}</p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">Vendor account</p>
                </div>
              </div>

              <SectionCard title="Business details" icon={<Store className="size-4" />}>
                <Grid cols={2}>
                  <FieldWithError
                    label="Store name"
                    required
                    error={vendorTouched.business_name ? vendorErrors.business_name : null}
                  >
                    <FieldInput
                      value={vendor.business_name}
                      onChange={(e) => updateVendor("business_name", e.target.value)}
                      onBlur={() => touchVendor("business_name")}
                      hasError={!!vendorErrors.business_name}
                    />
                  </FieldWithError>
                  <FieldWithError
                    label="Support email"
                    required
                    error={vendorTouched.business_email ? vendorErrors.business_email : null}
                  >
                    <FieldInput
                      type="email"
                      value={vendor.business_email}
                      onChange={(e) => updateVendor("business_email", e.target.value)}
                      onBlur={() => touchVendor("business_email")}
                      hasError={!!vendorErrors.business_email}
                    />
                  </FieldWithError>
                  <FieldWithError label="Business phone" hint="optional">
                    <FieldInput
                      value={vendor.business_phone}
                      onChange={(e) => updateVendor("business_phone", e.target.value)}
                      placeholder="+250 ..."
                    />
                  </FieldWithError>
                  <FieldWithError label="Store website" hint="optional">
                    <FieldInput
                      value={vendor.website}
                      onChange={(e) => updateVendor("website", e.target.value)}
                      placeholder="https://"
                    />
                  </FieldWithError>
                  <FieldWithError label="Tax ID / TIN" hint="optional">
                    <FieldInput
                      value={vendor.tax_id}
                      onChange={(e) => updateVendor("tax_id", e.target.value)}
                    />
                  </FieldWithError>
                  <FieldWithError label="Business country">
                    <FieldInput
                      value={vendor.business_country}
                      onChange={(e) => updateVendor("business_country", e.target.value.toUpperCase())}
                    />
                  </FieldWithError>
                </Grid>

                <FieldWithError label="Description" hint="optional">
                  <StyledTextarea
                    value={vendor.business_description}
                    onChange={(e) => updateVendor("business_description", e.target.value)}
                    maxLength={500}
                  />
                </FieldWithError>

                <FieldWithError label="Business address" hint="optional">
                  <FieldInput
                    value={vendor.business_address}
                    onChange={(e) => updateVendor("business_address", e.target.value)}
                  />
                </FieldWithError>
              </SectionCard>

              <SectionCard title="Payout" icon={<CreditCard className="size-4" />}>
                <Grid cols={2}>
                  <FieldWithError label="Payment method">
                    <CustomSelect
                      options={[
                        { value: "bank", label: "Bank transfer" },
                        { value: "momo", label: "Mobile money" },
                        { value: "paypal", label: "PayPal" },
                      ]}
                      value={vendor.payout_method}
                      onChange={(v) => updateVendor("payout_method", v)}
                      className="w-full"
                    />
                  </FieldWithError>
                  <FieldWithError
                    label="Account number / ID"
                    error={vendorTouched.payout_account ? vendorErrors.payout_account : null}
                  >
                    <FieldInput
                      value={vendor.payout_account}
                      onChange={(e) => updateVendor("payout_account", e.target.value)}
                      onBlur={() => touchVendor("payout_account")}
                      hasError={!!vendorErrors.payout_account}
                    />
                  </FieldWithError>
                </Grid>
              </SectionCard>

              <SectionCard title="Store policies" icon={<ImageIcon className="size-4" />}>
                <FieldWithError label="Shipping policy" hint="Shown to buyers when relevant">
                  <StyledTextarea
                    value={vendorPolicies.shipping_policy}
                    onChange={(e) =>
                      setVendorPolicies((p) => ({ ...p, shipping_policy: e.target.value }))
                    }
                    placeholder="Delivery times, regions served…"
                    maxLength={2000}
                  />
                </FieldWithError>
                <FieldWithError label="Return & refund policy">
                  <StyledTextarea
                    value={vendorPolicies.return_policy}
                    onChange={(e) =>
                      setVendorPolicies((p) => ({ ...p, return_policy: e.target.value }))
                    }
                    placeholder="Return window, conditions…"
                    maxLength={2000}
                  />
                </FieldWithError>
              </SectionCard>

              <SectionCard title="Affiliate program" icon={<Link2 className="size-4" />}>
                <Toggle
                  checked={vendor.affiliate_enabled}
                  onChange={(v) => updateVendor("affiliate_enabled", v)}
                  label="Enable affiliates"
                  description="Allow partners to earn commission promoting your products"
                />
                {vendor.affiliate_enabled ? (
                  <FieldWithError
                    label="Base commission rate (%)"
                    error={vendorTouched.affiliate_commission_rate ? vendorErrors.affiliate_commission_rate : null}
                  >
                    <FieldInput
                      type="number"
                      value={vendor.affiliate_commission_rate}
                      onChange={(e) => updateVendor("affiliate_commission_rate", e.target.value)}
                      min={1}
                      max={100}
                      className="max-w-[140px]"
                    />
                  </FieldWithError>
                ) : null}
              </SectionCard>

              <SectionCard title="Integrations" icon={<Plug className="size-4" />}>
                <div className="rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Plug className="size-5 text-[var(--color-accent)]" />
                    <div>
                      <p className="text-sm font-medium">Shopify store</p>
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        Connect your Shopify catalog to Jimvio
                      </p>
                    </div>
                  </div>
                  <Link href="/vendor/shopify">
                    <BrandBtn variant="secondary" size="sm">
                      Connect
                    </BrandBtn>
                  </Link>
                </div>
              </SectionCard>

              {vendorHasErrors && (
                <ValidationBanner message="Please fix all required fields before saving." />
              )}

              <SaveRow onSave={saveVendor} pending={isPending} label="Save business" />
            </TabsContent>
          ) : null}

          {/* Preferences tab */}
          <TabsContent value="preferences" className="mt-0 space-y-6">
            <SectionCard title="Display & locale" icon={<Globe className="size-4" />}>
              <Grid cols={2}>
                <FieldWithError label="Language">
                  <CustomSelect
                    options={[
                      { value: "en", label: "English" },
                      { value: "fr", label: "French" },
                      { value: "rw", label: "Kinyarwanda" },
                    ]}
                    value={profile.language}
                    onChange={(v) => updateProfile("language", v)}
                    className="w-full"
                  />
                </FieldWithError>
                <FieldWithError label="Timezone">
                  <CustomSelect
                    options={[
                      { value: "Africa/Kigali", label: "Africa/Kigali" },
                      { value: "Africa/Nairobi", label: "Africa/Nairobi" },
                      { value: "UTC", label: "UTC" },
                    ]}
                    value={profile.timezone}
                    onChange={(v) => updateProfile("timezone", v)}
                    className="w-full"
                  />
                </FieldWithError>
                <FieldWithError label="Preferred currency">
                  <CustomSelect
                    options={Object.keys(SUPPORTED_CURRENCIES).map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    value={preferredCurrency}
                    onChange={setPreferredCurrency}
                    className="w-full"
                  />
                </FieldWithError>
              </Grid>
            </SectionCard>
            <SaveRow onSave={savePreferences} pending={isPending} label="Save preferences" />
          </TabsContent>

          {/* Roles tab */}
          <TabsContent value="roles" className="mt-0 space-y-4">
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Activate roles to unlock earning tools. Vendor onboarding uses a separate application flow.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: "vendor",
                  label: "Vendor",
                  active: Boolean(vendor) || activeRoles.includes("vendor"),
                  href: "/dashboard/activate/vendor",
                  desc: "Sell products on the marketplace",
                  icon: Store,
                },
                {
                  id: "affiliate",
                  label: "Affiliate",
                  active: hasAffiliate,
                  action: () => handleActivateRole("affiliate"),
                  desc: "Earn commission on referrals",
                  icon: Link2,
                },
                {
                  id: "influencer",
                  label: "Creator",
                  active: hasInfluencer,
                  action: () => handleActivateRole("influencer"),
                  desc: "UGC missions and brand campaigns",
                  icon: Video,
                },
              ].map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl border border-[var(--color-border)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <role.icon className="size-4 text-[var(--color-accent)]" />
                      <p className="font-semibold text-sm">{role.label}</p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        role.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {role.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--color-text-muted)]">{role.desc}</p>
                  {!role.active && role.href ? (
                    <Link href={role.href}>
                      <BrandBtn variant="secondary" size="sm">
                        Apply
                      </BrandBtn>
                    </Link>
                  ) : null}
                  {!role.active && role.action ? (
                    <BrandBtn variant="secondary" size="sm" onClick={role.action} disabled={isPending}>
                      Activate
                    </BrandBtn>
                  ) : null}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Affiliate tab */}
          {hasAffiliate ? (
            <TabsContent value="affiliate" className="mt-0 space-y-6">
              {!affiliate ? (
                <div className="rounded-xl border border-[var(--color-border)] p-4">
                  <p className="text-[13px] text-[var(--color-text-muted)] mb-3">
                    Finish activating your affiliate profile.
                  </p>
                  <BrandBtn onClick={() => handleActivateRole("affiliate")} disabled={isPending}>
                    Complete activation
                  </BrandBtn>
                </div>
              ) : (
                <>
                  <SectionCard title="Affiliate profile" icon={<Link2 className="size-4" />}>
                    <FieldWithError label="Bio" hint="optional">
                      <StyledTextarea
                        value={affiliate.bio}
                        onChange={(e) => setAffiliate((a) => (a ? { ...a, bio: e.target.value } : a))}
                        maxLength={500}
                      />
                    </FieldWithError>
                    <FieldWithError label="Website" hint="optional">
                      <FieldInput
                        value={affiliate.website}
                        onChange={(e) => setAffiliate((a) => (a ? { ...a, website: e.target.value } : a))}
                      />
                    </FieldWithError>
                    <FieldWithError label="Niche tags" hint="Comma-separated">
                      <FieldInput
                        value={affiliate.niche}
                        onChange={(e) => setAffiliate((a) => (a ? { ...a, niche: e.target.value } : a))}
                        placeholder="fashion, tech"
                      />
                    </FieldWithError>
                  </SectionCard>

                  <SectionCard title="Payout" icon={<CreditCard className="size-4" />}>
                    <Grid cols={2}>
                      <FieldWithError label="Method">
                        <CustomSelect
                          options={[
                            { value: "bank", label: "Bank" },
                            { value: "momo", label: "Mobile money" },
                            { value: "paypal", label: "PayPal" },
                          ]}
                          value={affiliate.payout_method}
                          onChange={(v) => setAffiliate((a) => (a ? { ...a, payout_method: v } : a))}
                          className="w-full"
                        />
                      </FieldWithError>
                      <FieldWithError label="Account">
                        <FieldInput
                          value={affiliate.payout_account}
                          onChange={(e) =>
                            setAffiliate((a) => (a ? { ...a, payout_account: e.target.value } : a))
                          }
                        />
                      </FieldWithError>
                    </Grid>
                  </SectionCard>

                  <SaveRow onSave={saveAffiliate} pending={isPending} label="Save affiliate" />
                </>
              )}
            </TabsContent>
          ) : null}

          {/* Creator tab */}
          {hasInfluencer ? (
            <TabsContent value="creator" className="mt-0 space-y-6">
              {!influencer ? (
                <div className="rounded-xl border border-[var(--color-border)] p-4">
                  <p className="text-[13px] text-[var(--color-text-muted)] mb-3">
                    Finish activating your creator profile.
                  </p>
                  <BrandBtn onClick={() => handleActivateRole("influencer")} disabled={isPending}>
                    Complete activation
                  </BrandBtn>
                </div>
              ) : (
                <>
                  <SectionCard title="Creator profile" icon={<Video className="size-4" />}>
                    <FieldWithError label="Display name" required>
                      <FieldInput
                        value={influencer.display_name}
                        onChange={(e) =>
                          setInfluencer((i) => (i ? { ...i, display_name: e.target.value } : i))
                        }
                      />
                    </FieldWithError>
                    <FieldWithError label="Bio">
                      <StyledTextarea
                        value={influencer.bio}
                        onChange={(e) => setInfluencer((i) => (i ? { ...i, bio: e.target.value } : i))}
                        maxLength={500}
                      />
                    </FieldWithError>
                    <FieldWithError label="Niche" hint="Comma-separated">
                      <FieldInput
                        value={influencer.niche}
                        onChange={(e) => setInfluencer((i) => (i ? { ...i, niche: e.target.value } : i))}
                      />
                    </FieldWithError>
                    <FieldWithError label="Social platforms" hint='JSON e.g. {"instagram":"@you"}'>
                      <StyledTextarea
                        value={influencer.social_platforms}
                        onChange={(e) =>
                          setInfluencer((i) => (i ? { ...i, social_platforms: e.target.value } : i))
                        }
                        className="font-mono text-[12px]"
                      />
                    </FieldWithError>
                  </SectionCard>

                  <SaveRow onSave={saveInfluencer} pending={isPending} label="Save creator profile" />
                </>
              )}
            </TabsContent>
          ) : null}

          {/* Notifications tab */}
          <TabsContent value="notifications" className="mt-0 space-y-6">
            <SectionCard title="Notification preferences" icon={<Bell className="size-4" />}>
              <div className="overflow-hidden rounded-xl ring-1 ring-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {[
                  { key: "new_sales", label: "New sales", desc: "When a customer buys your products" },
                  { key: "affiliate_activity", label: "Affiliate activity", desc: "Commission and referral events" },
                  { key: "withdrawals", label: "Withdrawals", desc: "Payout processed notifications" },
                  { key: "messages", label: "Messages", desc: "New direct messages" },
                  { key: "system_updates", label: "System updates", desc: "Critical account alerts" },
                  { key: "marketing", label: "Marketing", desc: "Product news and promotions" },
                ].map((item) => (
                  <div key={item.key} className="px-4 py-3">
                    <Toggle
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(v) =>
                        setNotifications((n) => ({ ...n, [item.key]: v }))
                      }
                      label={item.label}
                      description={item.desc}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SaveRow onSave={saveNotifications} pending={isPending} label="Save preferences" />
          </TabsContent>

          {/* Privacy tab */}
          <TabsContent value="privacy" className="mt-0 space-y-6">
            <SectionCard title="Your data" icon={<Download className="size-4" />}>
              <p className="text-[13px] text-[var(--color-text-muted)]">
                Download a JSON copy of your profile, roles, and recent orders.
              </p>
              <BrandBtn onClick={handleExportData} disabled={isPending} icon={<Download className="size-4" />}>
                Export my data
              </BrandBtn>
            </SectionCard>

            <SectionCard title="Account status" icon={<Trash2 className="size-4" />}>
              <p className="text-[13px] text-[var(--color-text-muted)]">
                Deactivating hides your account from the platform. Contact support to restore access.
              </p>
              <BrandBtn
                variant="ghost"
                onClick={handleDeactivate}
                disabled={isPending}
                icon={<Trash2 className="size-4" />}
              >
                Deactivate account
              </BrandBtn>
            </SectionCard>
        </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    </>
  );
}