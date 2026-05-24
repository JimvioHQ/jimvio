// "use server";

// import { createClient } from "@/lib/supabase/server";
// import { createClient as createAdminClient } from "@supabase/supabase-js";
// import { redirect } from "next/navigation";
// import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
// import { getPublicAppUrl } from "@/lib/app-url";

// /** Admin (service role) client — bypasses RLS for server-side operations */
// function getAdminClient() {
//   return createAdminClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { auth: { autoRefreshToken: false, persistSession: false } }
//   );
// }

// /** Ensure profile + role + wallet exist for a user */
// async function ensureUserProfile(userId: string, email: string, fullName?: string) {
//   const admin = getAdminClient();
//   try {
//     // Upsert profile
//     await admin.from("profiles").upsert({
//       id: userId,
//       email,
//       full_name: fullName || email.split("@")[0],
//     }, { onConflict: "id", ignoreDuplicates: true });

//     // Upsert buyer role
//     await admin.from("user_roles").upsert({
//       user_id: userId,
//       role: "buyer",
//     }, { onConflict: "user_id,role", ignoreDuplicates: true });

//     // Upsert wallet
//     await admin.from("wallets").upsert({
//       user_id: userId,
//     }, { onConflict: "user_id", ignoreDuplicates: true });
//   } catch (err) {
//     // Non-fatal — trigger may handle this separately
//     console.error("ensureUserProfile error:", err);
//   }
// }

// export async function signUp(formData: FormData) {
//   try {
//     const supabase = await createClient();
//     const email = (formData.get("email") as string)?.trim();
//     const password = formData.get("password") as string;
//     const fullName = (formData.get("full_name") as string)?.trim();

//     if (!email || !password) {
//       return { error: "Email and password are required." };
//     }

//     const next = (formData.get("next") as string)?.trim() || undefined;
//     let callbackUrl = `${getPublicAppUrl()}/auth/callback`;
//     if (next) {
//       callbackUrl += `?next=${encodeURIComponent(next)}`;
//     }

//     const { data, error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: { full_name: fullName },
//         emailRedirectTo: callbackUrl,
//       },
//     });

//     if (error) return { error: error.message };

//     // Manually ensure profile exists (in case the DB trigger hasn't run yet or failed)
//     if (data.user) {
//       await ensureUserProfile(data.user.id, email, fullName);
//     }

//     return { success: "Account created! Check your email to confirm your account." };
//   } catch (err) {
//     console.error("signUp error:", err);
//     return { error: "Registration failed. Please check your connection and try again." };
//   }
// }


// export async function signIn(formData: FormData) {
//   let userId: string | undefined;
//   let email: string | undefined;

//   try {
//     const supabase = await createClient();
//     email = (formData.get("email") as string)?.trim();
//     const password = formData.get("password") as string;

//     if (!email || !password) return { error: "Email and password are required." };

//     const { data, error } = await supabase.auth.signInWithPassword({ email, password });
//     if (error) return { error: error.message };

//     userId = data.user?.id;
//     if (userId && email) await ensureUserProfile(userId, email);

//   } catch (err) {
//     console.error("signIn error:", err);
//     return { error: "Sign in failed. Please try again." };
//   }

//   if (!userId) redirect("/dashboard");

//   // ── NEW: check if 2FA is enabled for this user ──
//   try {
//     const supabase = await createClient();
//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("two_factor_enabled")
//       .eq("id", userId)
//       .single();

//     if (profile?.two_factor_enabled) {
//       // Store the pending userId so the 2FA page knows who to verify
//       // Use a short-lived cookie (httpOnly, 5 min)
//       const { cookies } = await import("next/headers");
//       const cookieStore = await cookies();
//       cookieStore.set("2fa_pending_user", userId, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         maxAge: 60 * 5, // 5 minutes
//         path: "/",
//         sameSite: "lax",
//       });

//       const next = (formData.get("next") as string)?.trim() || "/dashboard";
//       redirect(`/login/2fa?next=${encodeURIComponent(next)}`);
//     }
//   } catch (err) {
//     console.error("2FA check error:", err);
//   }

//   const next = (formData.get("next") as string)?.trim() || undefined;
//   const path = await resolvePostLoginPath(userId, next);
//   redirect(path);
// }


// export async function verify2FAAndLogin(formData: FormData) {
//   const { cookies } = await import("next/headers");
//   const cookieStore = await cookies();

//   const pendingUserId = cookieStore.get("2fa_pending_user")?.value;
//   if (!pendingUserId) redirect("/login?error=Session+expired.+Please+sign+in+again.");

//   const token = (formData.get("token") as string)?.trim();
//   if (!token) return { error: "Please enter your verification code." };

//   // Use the security action we already wrote
//   const { verify2FALogin } = await import("@/lib/actions/security");

//   // verify2FALogin uses auth.getUser() internally — but at this point
//   // the user IS signed in via Supabase (password check passed).
//   // We just need to validate the TOTP before allowing access.
//   const supabase = await createClient();
//   const { data: secretData } = await (await import("@/lib/supabase/admin"))
//     .createAdminClient()
//     .from("user_2fa_secrets")
//     .select("secret, backup_codes")
//     .eq("user_id", pendingUserId)
//     .single();

//   if (!secretData?.secret) {
//     cookieStore.delete("2fa_pending_user");
//     redirect("/dashboard"); // 2FA row missing — let them through
//   }

//   const { verifyTOTP, generateBackupCodes } = await import("@/lib/totp");

//   // Check backup codes
//   const codes = (secretData.backup_codes ?? []) as string[];
//   const normalized = token.toUpperCase().replace(/[^A-Z0-9]/g, "");
//   const idx = codes.findIndex((c) => c.replace(/-/g, "").toUpperCase() === normalized);

//   if (idx !== -1) {
//     codes.splice(idx, 1);
//     await (await import("@/lib/supabase/admin"))
//       .createAdminClient()
//       .from("user_2fa_secrets")
//       .update({ backup_codes: codes, updated_at: new Date().toISOString() })
//       .eq("user_id", pendingUserId);

//     cookieStore.delete("2fa_pending_user");
//     const next = (formData.get("next") as string)?.trim() || "/dashboard";
//     redirect(next);
//   }

//   // Check TOTP
//   if (!verifyTOTP(secretData.secret, token)) {
//     return { error: "Invalid code. Please try again." };
//   }

//   cookieStore.delete("2fa_pending_user");
//   const next = (formData.get("next") as string)?.trim() || "/dashboard";
//   redirect(next);
// }

// export async function signInWithGoogle(nextOrFormData?: string | FormData): Promise<void> {
//   const nextPath = typeof nextOrFormData === 'string' ? nextOrFormData : undefined;
//   let redirectUrl: string | undefined;
//   try {
//     const supabase = await createClient();
//     let callbackUrl = `${getPublicAppUrl()}/auth/callback`;
//     if (nextPath) {
//       callbackUrl += `?next=${encodeURIComponent(nextPath)}`;
//     }

//     const { data, error } = await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: callbackUrl,
//       },
//     });
//     if (error) {
//       redirect(`/login?error=${encodeURIComponent(error.message)}`);
//       return;
//     }
//     redirectUrl = data.url;
//   } catch (err) {
//     console.error("signInWithGoogle error:", err);
//     redirect("/login?error=Google+sign-in+failed");
//     return;
//   }
//   if (redirectUrl) redirect(redirectUrl);
// }

// export async function signOut() {
//   try {
//     const supabase = await createClient();
//     await supabase.auth.signOut();
//   } catch (err) {
//     console.error("signOut error:", err);
//   }
//   redirect("/");
// }

// export async function resetPassword(formData: FormData) {
//   try {
//     const supabase = await createClient();
//     const email = (formData.get("email") as string)?.trim();
//     if (!email) return { error: "Email is required." };

//     const { error } = await supabase.auth.resetPasswordForEmail(email, {
//       redirectTo: `${getPublicAppUrl()}/reset-password`,
//     });
//     if (error) return { error: error.message };
//     return { success: "Password reset link sent to your email." };
//   } catch (err) {
//     console.error("resetPassword error:", err);
//     return { error: "Failed to send reset email. Please try again." };
//   }
// }

// export async function updatePassword(formData: FormData) {
//   const supabase = await createClient();
//   const password = formData.get("password") as string;
//   if (!password) return { error: "Password is required." };
//   try {
//     const { error } = await supabase.auth.updateUser({ password });
//     if (error) return { error: error.message };
//   } catch (err) {
//     console.error("updatePassword error:", err);
//     return { error: "Failed to update password. Please try again." };
//   }
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   redirect(user ? await resolvePostLoginPath(user.id, "/dashboard") : "/dashboard");
// }

// export async function getUser() {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     return user;
//   } catch {
//     return null;
//   }
// }

// export async function getProfile() {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return null;

//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("*, user_roles(*), wallets(*)")
//       .eq("id", user.id)
//       .single();

//     return profile;
//   } catch {
//     return null;
//   }
// }

"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import { getPublicAppUrl } from "@/lib/app-url";

/** Admin (service role) client — bypasses RLS for server-side operations */
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/** Ensure profile + role + wallet exist for a user */
async function ensureUserProfile(
  userId: string,
  email: string,
  fullName?: string
) {
  const admin = getAdminClient();

  try {
    // Upsert profile
    await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName || email.split("@")[0],
      },
      {
        onConflict: "id",
        ignoreDuplicates: true,
      }
    );

    // Upsert buyer role
    await admin.from("user_roles").upsert(
      {
        user_id: userId,
        role: "buyer",
      },
      {
        onConflict: "user_id,role",
        ignoreDuplicates: true,
      }
    );

    // Upsert wallet
    await admin.from("wallets").upsert(
      {
        user_id: userId,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: true,
      }
    );
  } catch (err) {
    console.error("ensureUserProfile error:", err);
  }
}

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient();

    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const fullName = (formData.get("full_name") as string)?.trim();

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    const next = (formData.get("next") as string)?.trim() || undefined;

    let callbackUrl = `${getPublicAppUrl()}/auth/callback`;

    if (next) {
      callbackUrl += `?next=${encodeURIComponent(next)}`;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      await ensureUserProfile(data.user.id, email, fullName);
    }

    return {
      success:
        "Account created! Check your email to confirm your account.",
    };
  } catch (err) {
    console.error("signUp error:", err);

    return {
      error:
        "Registration failed. Please check your connection and try again.",
    };
  }
}

export async function signIn(formData: FormData) {
  let userId: string | undefined;
  let email: string | undefined;

  try {
    const supabase = await createClient();

    email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    userId = data.user?.id;

    if (userId && email) {
      await ensureUserProfile(userId, email);
    }
  } catch (err) {
    console.error("signIn error:", err);

    return {
      error: "Sign in failed. Please try again.",
    };
  }

  if (!userId) {
    redirect("/dashboard");
  }

  // Check if 2FA is enabled
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("two_factor_enabled")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("2FA profile lookup error:", profileError);
  }

  if (profile?.two_factor_enabled) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    cookieStore.set("2fa_pending_user", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5,
    });

    const next =
      (formData.get("next") as string)?.trim() || "/dashboard";

    redirect(`/login/2fa?next=${encodeURIComponent(next)}`);
  }

  const next = (formData.get("next") as string)?.trim() || undefined;

  const path = await resolvePostLoginPath(userId, next);

  redirect(path);
}

export async function verify2FAAndLogin(formData: FormData) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const pendingUserId =
    cookieStore.get("2fa_pending_user")?.value;

  if (!pendingUserId) {
    redirect(
      "/login?error=Session+expired.+Please+sign+in+again."
    );
  }

  const token = (formData.get("token") as string)?.trim();

  if (!token) {
    return {
      error: "Please enter your verification code.",
    };
  }

  const supabase = await createClient();

  const admin = (
    await import("@/lib/supabase/admin")
  ).createAdminClient();

  const { data: secretData, error } = await admin
    .from("user_2fa_secrets")
    .select("secret, backup_codes")
    .eq("user_id", pendingUserId)
    .single();

  if (error) {
    console.error("2FA secret lookup error:", error);

    return {
      error: "Failed to verify 2FA.",
    };
  }

  if (!secretData?.secret) {
    cookieStore.delete("2fa_pending_user");

    redirect("/dashboard");
  }

  const { verifyTOTP } = await import("@/lib/totp");

  // Backup codes
  const codes = (secretData.backup_codes ?? []) as string[];

  const normalized = token
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const idx = codes.findIndex(
    (c) =>
      c.replace(/-/g, "").toUpperCase() === normalized
  );

  if (idx !== -1) {
    codes.splice(idx, 1);

    await admin
      .from("user_2fa_secrets")
      .update({
        backup_codes: codes,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", pendingUserId);

    cookieStore.delete("2fa_pending_user");

    const next =
      (formData.get("next") as string)?.trim() ||
      "/dashboard";

    redirect(next);
  }

  // TOTP verification
  const valid = verifyTOTP(secretData.secret, token);

  if (!valid) {
    return {
      error: "Invalid code. Please try again.",
    };
  }

  cookieStore.delete("2fa_pending_user");

  const next =
    (formData.get("next") as string)?.trim() ||
    "/dashboard";

  redirect(next);
}

export async function signInWithGoogle(
  nextOrFormData?: string | FormData
): Promise<void> {
  let redirectUrl: string | undefined;

  try {
    const supabase = await createClient();

    const nextPath =
      typeof nextOrFormData === "string"
        ? nextOrFormData
        : undefined;

    let callbackUrl = `${getPublicAppUrl()}/auth/callback`;

    if (nextPath) {
      callbackUrl += `?next=${encodeURIComponent(nextPath)}`;
    }

    const { data, error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });

    if (error) {
      redirectUrl = `/login?error=${encodeURIComponent(
        error.message
      )}`;

      return;
    }

    redirectUrl = data.url;
  } catch (err) {
    console.error("signInWithGoogle error:", err);

    redirectUrl = "/login?error=Google+sign-in+failed";
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }
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

    if (!email) {
      return {
        error: "Email is required.",
      };
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getPublicAppUrl()}/reset-password`,
      });

    if (error) {
      return {
        error: error.message,
      };
    }

    return {
      success:
        "Password reset link sent to your email.",
    };
  } catch (err) {
    console.error("resetPassword error:", err);

    return {
      error:
        "Failed to send reset email. Please try again.",
    };
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;

  if (!password) {
    return {
      error: "Password is required.",
    };
  }

  try {
    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      return {
        error: error.message,
      };
    }
  } catch (err) {
    console.error("updatePassword error:", err);

    return {
      error:
        "Failed to update password. Please try again.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = user
    ? await resolvePostLoginPath(user.id, "/dashboard")
    : "/dashboard";

  redirect(path);
}

export async function getUser() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
}

export async function getProfile() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

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