"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";

/** Admin (service role) client — bypasses RLS for server-side operations */
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Ensure profile + role + wallet exist for a user */
async function ensureUserProfile(userId: string, email: string, fullName?: string) {
  const admin = getAdminClient();
  try {
    // Upsert profile
    await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName || email.split("@")[0],
    }, { onConflict: "id", ignoreDuplicates: true });

    // Upsert buyer role
    await admin.from("user_roles").upsert({
      user_id: userId,
      role: "buyer",
    }, { onConflict: "user_id,role", ignoreDuplicates: true });

    // Upsert wallet
    await admin.from("wallets").upsert({
      user_id: userId,
    }, { onConflict: "user_id", ignoreDuplicates: true });
  } catch (err) {
    // Non-fatal — trigger may handle this separately
    console.error("ensureUserProfile error:", err);
  }
}

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient();
    const email    = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const fullName = (formData.get("full_name") as string)?.trim();

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) return { error: error.message };

    // Manually ensure profile exists (in case the DB trigger hasn't run yet or failed)
    if (data.user) {
      await ensureUserProfile(data.user.id, email, fullName);
    }

    return { success: "Account created! Check your email to confirm your account." };
  } catch (err) {
    console.error("signUp error:", err);
    return { error: "Registration failed. Please check your connection and try again." };
  }
}

export async function signIn(formData: FormData) {
  let userId: string | undefined;
  let email: string | undefined;

  try {
    const supabase = await createClient();
    email    = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    userId = data.user?.id;

    // Ensure profile exists in case trigger didn't run
    if (userId && email) {
      await ensureUserProfile(userId, email);
    }
  } catch (err) {
    console.error("signIn error:", err);
    return { error: "Sign in failed. Please try again." };
  }

  const next = (formData.get("next") as string)?.trim() || undefined;
  if (!userId) redirect("/dashboard");
  const path = await resolvePostLoginPath(userId, next);
  redirect(path);
}

export async function signInWithGoogle(): Promise<void> {
  let redirectUrl: string | undefined;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });
    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
      return;
    }
    redirectUrl = data.url;
  } catch (err) {
    console.error("signInWithGoogle error:", err);
    redirect("/login?error=Google+sign-in+failed");
    return;
  }
  if (redirectUrl) redirect(redirectUrl);
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("signOut error:", err);
  }
  redirect("/");
}

export async function resetPassword(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = (formData.get("email") as string)?.trim();
    if (!email) return { error: "Email is required." };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`,
    });
    if (error) return { error: error.message };
    return { success: "Password reset link sent to your email." };
  } catch (err) {
    console.error("resetPassword error:", err);
    return { error: "Failed to send reset email. Please try again." };
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  if (!password) return { error: "Password is required." };
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("updatePassword error:", err);
    return { error: "Failed to update password. Please try again." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? await resolvePostLoginPath(user.id, "/dashboard") : "/dashboard");
}

export async function getUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getProfile() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, user_roles(*), wallets(*)")
      .eq("id", user.id)
      .single();

    return profile;
  } catch {
    return null;
  }
}
