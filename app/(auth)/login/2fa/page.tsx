import { TwoFALoginForm } from "@/components/auth/two-fa-login-form";
import { isSafeInternalPath } from "@/lib/auth/safe-path";
import { TWO_FA_PENDING_COOKIE } from "@/lib/auth/two-fa-session";
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
        cookieStore.get(TWO_FA_PENDING_COOKIE)?.value;
    if (!pendingUser) {
        redirect("/login");
    }

    return (
        <div className="mx-auto max-w-md px-4 py-10">
            <TwoFALoginForm
                next={params.next && isSafeInternalPath(params.next) ? params.next : "/dashboard"}
            />
        </div>
    );
}