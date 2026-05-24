import { TwoFALoginForm } from "@/components/auth/two-fa-login-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface Props {
    searchParams: Promise<{
        next?: string;
    }>;
}

export default async function TwoFAPage({
    searchParams,
}: Props) {
    const params = await searchParams;

    const cookieStore = await cookies();

    const pendingUser =
        cookieStore.get("2fa_pending_user")?.value;

    // No pending session — send back to login
    if (!pendingUser) {
        redirect("/login");
    }

    return (
        <div className="mx-auto max-w-md px-4 py-10">
            <TwoFALoginForm
                next={params.next ?? "/dashboard"}
            />
        </div>
    );
}