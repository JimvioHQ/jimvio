// "use client";

// import { useState, useTransition } from "react";
// import { verify2FAAndLogin } from "@/lib/auth/actions";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { ShieldCheck } from "lucide-react";

// export function TwoFALoginForm({
//     next,
// }: {
//     next: string;
// }) {
//     const [error, setError] = useState<string | null>(
//         null
//     );

//     const [pending, startTransition] =
//         useTransition();

//     function handleSubmit(
//         e: React.FormEvent<HTMLFormElement>
//     ) {
//         e.preventDefault();

//         setError(null);

//         const fd = new FormData(e.currentTarget);

//         fd.set("next", next);

//         startTransition(async () => {
//             try {
//                 const result =
//                     await verify2FAAndLogin(fd);

//                 if (result?.error) {
//                     setError(result.error);
//                 }
//             } catch (err) {
//                 console.error("2FA verify error:", err);

//                 setError(
//                     err instanceof Error
//                         ? err.message
//                         : "Verification failed"
//                 );
//             }
//         });
//     }

//     return (
//         <div className="w-full max-w-sm space-y-6">
//             <div className="space-y-2 text-center">
//                 <ShieldCheck className="mx-auto h-10 w-10 text-orange-500" />

//                 <h1 className="text-2xl font-black tracking-tight">
//                     Two-factor authentication
//                 </h1>

//                 <p className="text-sm text-zinc-500">
//                     Enter the 6-digit code from your
//                     authenticator app, or a backup code.
//                 </p>
//             </div>
//             <form
//                 onSubmit={handleSubmit}
//                 className="space-y-4"
//             >
//                 {error && (
//                     <div
//                         role="alert"
//                         className="rounded-sm bg-red-50 p-3 text-center text-sm font-semibold text-red-600"
//                     >
//                         {error}
//                     </div>
//                 )}

//                 <Input
//                     name="token"
//                     placeholder="000000"
//                     maxLength={10}
//                     autoFocus
//                     autoComplete="one-time-code"
//                     inputMode="numeric"
//                     className="h-12 text-center text-xl tracking-widest"
//                     disabled={pending}
//                 />

//                 <Button
//                     type="submit"
//                     className="h-12 w-full rounded-sm bg-zinc-900 font-bold text-white"
//                     disabled={pending}
//                 >
//                     {pending
//                         ? "Verifying…"
//                         : "Verify"}
//                 </Button>
//             </form>

//             <p className="text-center text-xs text-zinc-500">
//                 Lost access to your authenticator?{" "}
//                 <span className="font-semibold">
//                     Use a backup code above.
//                 </span>
//             </p>
//         </div>
//     );
// }
"use client";

import {
    useEffect,
    useState,
    useTransition,
} from "react";

import { verify2FAAndLogin } from "@/lib/auth/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ShieldCheck } from "lucide-react";

export function TwoFALoginForm({
    next,
}: {
    next: string;
}) {
    const [token, setToken] = useState("");
    const [error, setError] = useState<string | null>(
        null
    );

    const [pending, startTransition] =
        useTransition();

    // Validation
    const normalized = token.trim();

    const isTotp = /^\d{6}$/.test(normalized);

    const isBackupCode =
        /^[A-Z0-9-]{8,}$/i.test(normalized);

    const isValid = isTotp || isBackupCode;

    async function submitToken(value: string) {
        setError(null);

        const fd = new FormData();

        fd.set("token", value);
        fd.set("next", next);

        startTransition(async () => {
            try {
                const result =
                    await verify2FAAndLogin(fd);

                if (result?.error) {
                    setError(result.error);
                }
            } catch (err) {
                console.error(
                    "2FA verify error:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Verification failed"
                );
            }
        });
    }

    // Auto verify when 6-digit TOTP is complete
    useEffect(() => {
        if (
            isTotp &&
            normalized.length === 6 &&
            !pending
        ) {
            submitToken(normalized);
        }
    }, [normalized]);

    function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault();

        if (!isValid || pending) {
            setError(
                "Enter a valid 6-digit code or backup code."
            );

            return;
        }

        submitToken(normalized);
    }

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        let value = e.target.value;

        // Allow backup codes
        if (/[a-zA-Z-]/.test(value)) {
            value = value
                .toUpperCase()
                .replace(/[^A-Z0-9-]/g, "");
        } else {
            // Numeric only for TOTP
            value = value.replace(/\D/g, "");
        }

        setToken(value);

        if (error) {
            setError(null);
        }
    }

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-orange-500" />

                <h1 className="text-2xl font-black tracking-tight">
                    Two-factor authentication
                </h1>

                <p className="text-sm text-zinc-500">
                    Enter the 6-digit code from your
                    authenticator app, or a backup code.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                {error && (
                    <div
                        role="alert"
                        className="rounded-sm bg-red-50 p-3 text-center text-sm font-semibold text-red-600"
                    >
                        {error}
                    </div>
                )}

                <Input
                    name="token"
                    value={token}
                    onChange={handleChange}
                    placeholder="000000"
                    maxLength={20}
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    className="h-12 text-center text-xl tracking-widest"
                    disabled={pending}
                />

                <Button
                    type="submit"
                    className="h-12 w-full rounded-sm bg-zinc-900 font-bold text-white"
                    disabled={pending || !isValid}
                >
                    {pending
                        ? "Verifying…"
                        : "Verify"}
                </Button>
            </form>

            <p className="text-center text-xs text-zinc-500">
                Lost access to your authenticator?{" "}
                <span className="font-semibold">
                    Use a backup code above.
                </span>
            </p>
        </div>
    );
}