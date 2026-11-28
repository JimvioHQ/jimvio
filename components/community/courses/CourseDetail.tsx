"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";

type Detail = {
  course: {
    id: string;
    title: string;
    description: string | null;
    difficulty: string | null;
    category: string | null;
    language: string | null;
    access_mode: string | null;
    price_cents: number | null;
    currency: string | null;
    thumbnail_url: string | null;
    total_modules: number | null;
    total_lessons: number | null;
    total_duration: number | null;
    certificate_enabled: boolean | null;
    learning_outcomes: string[];
    prerequisites: string[];
    community: { name?: string; slug?: string } | null;
    instructor: { full_name?: string | null; username?: string | null } | null;
  };
  modules: Array<{ id: string; title: string; course_lessons: Array<{ id: string; title: string; duration: number | null }> }>;
  access: { enrolled: boolean; fullContent: boolean };
  rating: { average: number | null; count: number };
  reviews: Array<{ id: string; rating: number; body: string | null }>;
};

export function CourseDetail({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/c/courses/${courseId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setData(null);
        setError(json.error ?? "Could not load course");
      } else setData(json);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, reloadKey]);

  async function enroll() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/c/courses/${courseId}/enroll`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not enroll");
      return;
    }
    setData((current) => (current ? { ...current, access: { enrolled: true, fullContent: true } } : current));
    router.push(`/communities/${data?.course.community?.slug}/courses/${courseId}/learn`);
  }

  async function buy(method: "wallet" | "flutterwave") {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/c/courses/${courseId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Checkout failed");
      return;
    }
    if (json.checkoutUrl) {
      window.location.href = json.checkoutUrl;
      return;
    }
    setData((current) => (current ? { ...current, access: { enrolled: true, fullContent: true } } : current));
    router.push(`/communities/${data?.course.community?.slug}/courses/${courseId}/learn`);
  }

  if (loading) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-[#F3F4F6]" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center">
        <p className="font-semibold text-[#111827]">{error ?? "Course unavailable"}</p>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
        <Link href="/communities/courses" className="mt-4 inline-block text-sm font-semibold text-[#FF5A1F]">
          Back to courses
        </Link>
      </div>
    );
  }

  const course = data.course;
  const price = course.price_cents && course.price_cents > 0 ? course.price_cents / 100 : 0;
  const instructor = course.instructor?.full_name || course.instructor?.username || "Instructor";
  const actualModules = data.modules.length;
  const actualLessons = data.modules.reduce((total, module) => total + (module.course_lessons?.length ?? 0), 0);
  const actualDuration = data.modules.reduce((total, module) => total + (module.course_lessons ?? []).reduce((sum, lesson) => sum + Math.max(0, Number(lesson.duration ?? 0)), 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 lg:py-10">
      <div className="grid overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={`${course.title} course cover`} className="h-full min-h-64 w-full object-cover lg:min-h-[420px]" />
        ) : (
          <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-[#111827] via-[#374151] to-[#FF5A1F] text-white lg:min-h-[420px]"><GraduationCap className="h-20 w-20 opacity-90" /></div>
        )}
        <div className="flex flex-col items-start justify-center gap-4 p-6 sm:p-8 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-wide text-[#FF5A1F]">{course.community?.name}</p>
          <h1 className="text-2xl font-semibold text-[#111827]">{course.title}</h1>
          <p className="text-sm text-[#6B7280]">
            {instructor} · {course.difficulty ?? "Beginner"} · {course.language ?? "English"} · {actualModules} modules · {actualLessons} lessons{actualDuration ? ` · ${actualDuration} min` : ""}
          </p>
          <p className="text-sm leading-6 text-[#374151]">{course.description}</p>
          <p className="text-lg font-semibold text-[#111827]">{price > 0 ? `$${price.toFixed(2)}` : "Free"}</p>
          {data.rating.count > 0 && (
            <p className="text-sm text-[#6B7280]">{data.rating.average} / 5 from {data.rating.count} reviews</p>
          )}
          {message && <p className="text-sm text-red-600">{message}</p>}
          {data.access.fullContent ? (
            <Link
              href={`/communities/${course.community?.slug}/courses/${course.id}/learn`}
              className="inline-flex h-10 items-center rounded-xl bg-[#FF5A1F] px-4 text-sm font-semibold text-white"
            >
              Continue learning
            </Link>
          ) : price > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void buy("flutterwave")} className="h-10 rounded-xl bg-[#FF5A1F] px-4 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy course"}
              </button>
              <button type="button" disabled={busy} onClick={() => void buy("wallet")} className="h-10 rounded-xl border border-[#E5E7EB] px-4 text-sm font-semibold disabled:opacity-50">
                Pay with wallet
              </button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => void enroll()} className="h-10 rounded-xl bg-[#FF5A1F] px-4 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Enrolling…" : "Enroll"}
            </button>
          )}
        </div>
      </div>
      {course.learning_outcomes.length > 0 && (
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="font-semibold">What you will learn</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#374151]">
            {course.learning_outcomes.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}
      {course.prerequisites.length > 0 && (
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="font-semibold">Prerequisites</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#374151]">
            {course.prerequisites.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A1F]">Course outline</p><h2 className="mt-1 text-xl font-semibold text-[#111827]">Curriculum</h2></div><p className="text-sm text-[#6B7280]">{actualModules} modules · {actualLessons} lessons</p></div>
        <div className="mt-5 space-y-4">
          {data.modules.map((module) => (
            <div key={module.id} className="rounded-2xl border border-[#E5E7EB] p-4">
              <p className="text-sm font-semibold text-[#111827]">{module.title}</p>
              <ul className="mt-3 space-y-2 pl-1 text-sm text-[#6B7280]">
                {(module.course_lessons ?? []).map((lesson) => (
                  <li key={lesson.id} className="flex items-center justify-between gap-3"><span>{lesson.title}</span>{lesson.duration ? <span className="shrink-0 text-xs text-[#9CA3AF]">{lesson.duration} min</span> : null}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
