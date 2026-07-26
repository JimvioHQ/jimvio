import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/certificates/[code]
 * Public verification of a completion certificate (metadata only).
 * PDF generation: not shipped — clients can print the verify page.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await params;
  const code = raw?.trim().toUpperCase();
  if (!code || code.length < 6) {
    return NextResponse.json({ error: "Invalid certificate code" }, { status: 400 });
  }

  const limited = rateLimit(`cert-verify:${code.slice(0, 12)}`, 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = createServiceRoleClient();
  const { data: cert, error } = await admin
    .from("course_certificates")
    .select(
      "id, certificate_code, issued_at, pdf_url, course_id, user_id, community_courses(id, title, thumbnail_url, community_id), profiles!course_certificates_user_id_fkey(full_name, username)"
    )
    .eq("certificate_code", code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const courseRaw = cert.community_courses as
    | {
        id: string;
        title: string;
        thumbnail_url: string | null;
        community_id: string;
      }
    | {
        id: string;
        title: string;
        thumbnail_url: string | null;
        community_id: string;
      }[]
    | null;
  const course = Array.isArray(courseRaw) ? courseRaw[0] ?? null : courseRaw;
  const profileRaw = cert.profiles as
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] ?? null : profileRaw;

  return NextResponse.json({
    valid: true,
    certificate: {
      code: cert.certificate_code,
      issuedAt: cert.issued_at,
      pdfUrl: cert.pdf_url,
      download: {
        available: Boolean(cert.pdf_url),
        format: cert.pdf_url ? "pdf" : "html-print",
        verifyUrl: `/certificates/verify/${cert.certificate_code}`,
      },
      recipient: {
        name: profile?.full_name ?? profile?.username ?? "Learner",
      },
      course: {
        id: course?.id ?? cert.course_id,
        title: course?.title ?? "Course",
        thumbnailUrl: course?.thumbnail_url ?? null,
      },
    },
    /** PDF backend plan when Cloudinary/PDF worker unavailable:
     * 1) Render HTML verify page with print stylesheet
     * 2) Optional async worker: puppeteer/playwright → upload PDF → set pdf_url
     * 3) Keep certificate_code stable on upsert (do not rotate)
     */
    pdfPlan:
      "Use verify page print-to-PDF near-term; async PDF worker can fill pdf_url later.",
  });
}
