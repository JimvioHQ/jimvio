import { TwoFALoginForm } from "@/components/auth/two-fa-login-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function TwoFAPage({
    searchParams,
}: {
    searchParams: { next?: string };
}) {
    const cookieStore = await cookies();
    const pendingUser = cookieStore.get("2fa_pending_user")?.value;

    // No pending session — send back to login
    if (!pendingUser) redirect("/login");

    return (
        <div className="flex min-h-screen items-center justify-center">
            <TwoFALoginForm next={searchParams.next ?? "/dashboard"} />
        </div>
    );
}