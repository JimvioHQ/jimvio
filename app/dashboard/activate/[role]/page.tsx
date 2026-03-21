"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Store,
  Link2,
  Video,
  Users,
  ArrowRight,
  CheckCircle2,
  Building2,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const roleConfig: Record<string, { title: string; description: string; requirements: string[]; buttonLabel: string; setupPath: string; icon: React.ReactNode }> = {
  vendor: {
    title: "Become a Vendor",
    description: "Start selling products to global buyers. List your catalog, manage orders, and get paid securely.",
    requirements: ["Business name", "Business address", "Phone verification"],
    buttonLabel: "Apply as Vendor",
    setupPath: "/dashboard/vendor/setup",
    icon: <Store className="h-12 w-12 text-[var(--color-accent)]" />,
  },
  affiliate: {
    title: "Activate Affiliate",
    description: "Promote products and earn commission on every sale you drive. Generate links and track performance.",
    requirements: ["Active Jimvio account", "Accept affiliate terms"],
    buttonLabel: "Activate Affiliate",
    setupPath: "/dashboard/roles",
    icon: <Link2 className="h-12 w-12 text-emerald-600" />,
  },
  influencer: {
    title: "Join as Creator",
    description: "Create viral product clips, join campaigns, and earn from your audience.",
    requirements: ["Profile and social links", "Accept creator terms"],
    buttonLabel: "Activate Creator",
    setupPath: "/dashboard/roles",
    icon: <Video className="h-12 w-12 text-pink-600" />,
  },
  community: {
    title: "Join Communities",
    description: "Create or join paid communities. Host discussions and build recurring revenue.",
    requirements: ["Active account", "Community guidelines"],
    buttonLabel: "Get Started",
    setupPath: "/dashboard/roles",
    icon: <Users className="h-12 w-12 text-amber-600" />,
  },
};

export default function ActivateRolePage() {
  const router = useRouter();
  const params = useParams();
  const role = (params?.role as string)?.toLowerCase() || "";
  const config = roleConfig[role];
  const [alreadyActive, setAlreadyActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const table = role === "vendor" ? "vendors" : role === "affiliate" ? "affiliates" : role === "influencer" ? "influencers" : "communities";
      const col = role === "community" ? "owner_id" : "user_id";
      supabase.from(table).select("id").eq(col, user.id).maybeSingle().then(({ data }) => {
        setAlreadyActive(!!data);
        setLoading(false);
      });
    });
  }, [role, config]);

  if (!config) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <p className="text-[var(--color-text-muted)]">Unknown role.</p>
        <Link href="/dashboard"><Button className="mt-4">Back to Dashboard</Button></Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  if (alreadyActive) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card className="border-[var(--color-success)]/30 bg-[var(--color-success-light)]/30">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-[var(--color-success)] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">You&apos;re already active</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">This role is already activated on your account.</p>
            <Button asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <Card className="shadow-lg border-[var(--color-border)] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex justify-center mb-6">{config.icon}</div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-2">{config.title}</h1>
          <p className="text-[var(--color-text-secondary)] text-center text-sm mb-8">{config.description}</p>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Requirements</h2>
            <ul className="space-y-2">
              {config.requirements.map((req, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Building2 className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          <Button asChild className="w-full" size="lg">
            <Link href={config.setupPath}>
              {config.buttonLabel}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
