"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/security";

export type AdminProfileInput = {
  full_name: string;
  username: string;
  phone: string;
  bio: string;
  website: string;
  city: string;
  country: string;
  avatar_url: string;
};

export type AdminProfileData = AdminProfileInput & {
  email: string;
  is_verified: boolean;
  two_factor_enabled: boolean;
};

export async function getAdminProfile(): Promise<AdminProfileData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "email, full_name, username, phone, bio, website, city, country, avatar_url, is_verified, two_factor_enabled"
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    email: profile.email ?? user.email ?? "",
    full_name: profile.full_name ?? "",
    username: profile.username ?? "",
    phone: profile.phone ?? "",
    bio: profile.bio ?? "",
    website: profile.website ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "RW",
    avatar_url: profile.avatar_url ?? "",
    is_verified: profile.is_verified ?? false,
    two_factor_enabled: profile.two_factor_enabled ?? false,
  };
}

export async function updateAdminProfile(
  input: AdminProfileInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (!roles?.some((r) => r.role === "admin")) {
    return { success: false, error: "Admin access required." };
  }

  if (!input.full_name.trim()) {
    return { success: false, error: "Full name is required." };
  }

  if (input.username.trim() && !/^[a-z0-9_]{3,30}$/.test(input.username.trim())) {
    return {
      success: false,
      error: "Username must be 3–30 characters: lowercase letters, numbers, underscores.",
    };
  }

  if (input.website.trim() && !/^https?:\/\/.+/.test(input.website.trim())) {
    return { success: false, error: "Website must start with http:// or https://" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      username: input.username.trim() || null,
      phone: input.phone.trim() || null,
      bio: input.bio.trim() || null,
      website: input.website.trim() || null,
      city: input.city.trim() || null,
      country: input.country.trim() || "RW",
      avatar_url: input.avatar_url.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "That username is already taken." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/settings/profile");
  return { success: true };
}
