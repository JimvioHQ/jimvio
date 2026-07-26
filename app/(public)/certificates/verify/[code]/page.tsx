import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CertificatePrintButton } from "@/components/certificates/CertificatePrintButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Certificate ${code?.toUpperCase() ?? ""} · Jimvio`,
    robots: { index: false, follow: false },
  };
}

export default async function CertificateVerifyPage({ params }: Props) {
  const { code: raw } = await params;
  const code = raw?.trim().toUpperCase() ?? "";
  const admin = createServiceRoleClient();
  const { data: cert } = code
    ? await admin
        .from("course_certificates")
        .select(
          "certificate_code, issued_at, pdf_url, community_courses(title), profiles!course_certificates_user_id_fkey(full_name, username)"
        )
        .eq("certificate_code", code)
        .maybeSingle()
    : { data: null };

  const courseRaw = cert?.community_courses as
    | { title?: string }
    | { title?: string }[]
    | null
    | undefined;
  const course = Array.isArray(courseRaw) ? courseRaw[0] ?? null : courseRaw ?? null;
  const profileRaw = cert?.profiles as
    | { full_name?: string | null; username?: string | null }
    | { full_name?: string | null; username?: string | null }[]
    | null
    | undefined;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] ?? null : profileRaw ?? null;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-16">
      {!cert ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-neutral-900">Certificate not found</p>
          <p className="mt-2 text-sm text-neutral-500">
            Check the verification ID and try again.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Jimvio Creator University
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900">
            Certificate of Completion
          </h1>
          <p className="mt-6 text-sm text-neutral-600">This certifies that</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">
            {profile?.full_name ?? profile?.username ?? "Learner"}
          </p>
          <p className="mt-4 text-sm text-neutral-600">has completed</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">
            {course?.title ?? "Course"}
          </p>
          <dl className="mt-8 grid gap-3 text-sm text-neutral-600 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                Verification ID
              </dt>
              <dd className="font-mono text-neutral-900">{cert.certificate_code}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                Issued
              </dt>
              <dd className="text-neutral-900">
                {new Date(cert.issued_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3 print:hidden">
            <CertificatePrintButton />
            {cert.pdf_url ? (
              <a
                href={cert.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
              >
                Download PDF
              </a>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
