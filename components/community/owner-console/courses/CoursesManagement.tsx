"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hasCapability } from "@/lib/community/workspace/permissions";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";

type ManagedCourse = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  category: string | null;
  language: string | null;
  access_mode: string | null;
  price_cents: number | null;
  currency: string | null;
  is_published: boolean | null;
  archived_at: string | null;
  thumbnail_url: string | null;
  total_lessons: number | null;
  certificate_enabled: boolean | null;
  learning_outcomes: string[] | null;
  prerequisites: string[] | null;
  total_duration: number | null;
};

type Analytics = {
  enrollments: number;
  completionRate: number;
  revenueCents: number;
  courses: Array<{ id: string; title: string; enrollments: number; completionRate: number }>;
};

type Lesson = { id: string; title: string; module_id: string; body?: string | null; video_url?: string | null };
type Module = { id: string; title: string; course_lessons: Lesson[] };

function statusOf(course: ManagedCourse) {
  if (course.archived_at) return "Archived";
  if (course.is_published) return "Published";
  return "Draft";
}

export function CoursesManagement() {
  const { community, role } = useOwnerConsole();
  const canManage = hasCapability(role, "knowledge.manage");
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonBody, setLessonBody] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");
  const [lessonModule, setLessonModule] = useState("");
  const [roster, setRoster] = useState<Array<Record<string, unknown>>>([]);
  const [submissions, setSubmissions] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!community?.id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/c/owner/courses?communityId=${community.id}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "Could not load courses");
        setCourses(json.courses ?? []);
        setAnalytics(json.analytics ?? null);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load courses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [community]);

  const loadCourse = useCallback(async (courseId: string) => {
    const res = await fetch(`/api/c/owner/courses/${courseId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Could not load course");
    const tree = (json.course?.modules ?? []) as Module[];
    setModules(tree);
    setLessonModule(tree[0]?.id ?? "");
    setRoster(json.roster?.enrollments ?? []);
    setSubmissions(json.roster?.submissions ?? []);
    if (json.course) {
      setCourses((prev) => prev.map((course) => (course.id === courseId ? { ...course, ...json.course } : course)));
    }
  }, []);

  const selected = useMemo(
    () => courses.find((course) => course.id === selectedId) ?? null,
    [courses, selectedId]
  );

  async function refreshList() {
    if (!community?.id) return;
    const res = await fetch(`/api/c/owner/courses?communityId=${community.id}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Could not load courses");
    setCourses(json.courses ?? []);
    setAnalytics(json.analytics ?? null);
  }

  async function run(courseId: string, action: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    try {
      const res = await fetch(`/api/c/owner/courses/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast.success("Saved");
      await refreshList();
      await loadCourse(courseId);
      return json;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function createCourse() {
    if (!community?.id || title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    setBusy("create");
    try {
      const res = await fetch("/api/c/owner/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: community.id, title: title.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create course");
      setTitle("");
      toast.success("Draft created");
      setSelectedId(json.course.id);
      await refreshList();
      await loadCourse(json.course.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create course");
    } finally {
      setBusy(null);
    }
  }

  if (!community) return null;
  if (!canManage) {
    return <p className="text-sm text-[#6B7280]">You do not have permission to manage courses.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Enrollments", analytics?.enrollments ?? 0],
          ["Completion", `${analytics?.completionRate ?? 0}%`],
          ["Revenue", `$${((analytics?.revenueCents ?? 0) / 100).toFixed(2)}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-[12px] font-semibold text-[#6B7280]">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New course title"
          aria-label="New course title"
        />
        <Button type="button" className="bg-[#FF5A1F] hover:bg-[#F04E14]" disabled={busy === "create"} onClick={() => void createCourse()}>
          {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create draft
        </Button>
      </div>

      {loading ? (
        <div className="h-28 animate-pulse rounded-2xl bg-[#F3F4F6]" />
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center">
          <p className="font-semibold text-[#111827]">No courses yet</p>
          <p className="mt-1 text-sm text-[#6B7280]">Create a draft, add lessons, then publish it to members.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {courses.map((course) => (
              <li key={course.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(course.id);
                    void loadCourse(course.id).catch((error) => toast.error(error.message));
                  }}
                  className={`w-full rounded-xl border px-3 py-3 text-left ${
                    selectedId === course.id ? "border-[#FF5A1F] bg-[#FFF7F3]" : "border-[#E5E7EB] bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#111827]">{course.title}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    {statusOf(course)} · {course.total_lessons ?? 0} lessons
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="bg-[#FF5A1F] hover:bg-[#F04E14]" disabled={!!busy} onClick={() => void run(selected.id, "publish")}>
                  Publish
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void run(selected.id, "unpublish")}>
                  Unpublish
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void run(selected.id, "archive")}>
                  Archive
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void run(selected.id, "duplicate")}>
                  Duplicate
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href={`/communities/${community.slug}/courses/${selected.id}?preview=1`}>Preview</Link>
                </Button>
              </div>
              <p className="text-xs font-semibold uppercase text-[#FF5A1F]">{statusOf(selected)}</p>
              <label className="block text-sm font-medium text-[#111827]">
                Description
                <Textarea
                  className="mt-1"
                  defaultValue={selected.description ?? ""}
                  key={`${selected.id}-description`}
                  onBlur={(event) => void run(selected.id, "update", { description: event.target.value })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Category
                  <Input className="mt-1" key={`${selected.id}-category`} defaultValue={selected.category ?? ""} onBlur={(event) => void run(selected.id, "update", { category: event.target.value })} />
                </label>
                <label className="text-sm font-medium">
                  Level
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
                    value={selected.difficulty ?? "beginner"}
                    onChange={(event) => void run(selected.id, "update", { difficulty: event.target.value })}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Language
                  <Input className="mt-1" defaultValue={selected.language ?? "en"} key={`${selected.id}-language`} onBlur={(event) => void run(selected.id, "update", { language: event.target.value })} />
                </label>
                <label className="text-sm font-medium">
                  Access
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
                    value={selected.access_mode ?? "members"}
                    onChange={(event) => void run(selected.id, "update", { access_mode: event.target.value })}
                  >
                    <option value="public">Public</option>
                    <option value="members">Community members</option>
                    <option value="private">Invitation only</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Price (USD)
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    step="0.01"
                    key={`${selected.id}-price`}
                    defaultValue={selected.price_cents ? (selected.price_cents / 100).toFixed(2) : ""}
                    onBlur={(event) => {
                      const dollars = Number(event.target.value);
                      void run(selected.id, "update", {
                        price_cents: Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : null,
                        currency: "USD",
                      });
                    }}
                  />
                </label>
                <label className="text-sm font-medium">
                  Thumbnail URL
                  <Input className="mt-1" key={`${selected.id}-thumb`} defaultValue={selected.thumbnail_url ?? ""} onBlur={(event) => void run(selected.id, "update", { thumbnail_url: event.target.value })} />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Learning outcomes (one per line)
                <Textarea
                  className="mt-1"
                  key={`${selected.id}-outcomes`}
                  defaultValue={(selected.learning_outcomes ?? []).join("\n")}
                  onBlur={(event) =>
                    void run(selected.id, "update", {
                      learning_outcomes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Prerequisites (one per line)
                <Textarea
                  className="mt-1"
                  key={`${selected.id}-prereq`}
                  defaultValue={(selected.prerequisites ?? []).join("\n")}
                  onBlur={(event) =>
                    void run(selected.id, "update", {
                      prerequisites: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(selected.certificate_enabled)}
                  onChange={(event) => void run(selected.id, "update", { certificate_enabled: event.target.checked })}
                />
                Issue a certificate when requirements are met
              </label>

              <div className="border-t border-[#E5E7EB] pt-4">
                <h2 className="text-sm font-semibold">Curriculum</h2>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(selected.id, "module", { title: moduleTitle, sortOrder: modules.length }).then(() => setModuleTitle(""));
                  }}
                >
                  <Input value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="Module title" required />
                  <Button type="submit" variant="outline" disabled={!!busy}>Add module</Button>
                </form>
                <form
                  className="mt-2 grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(selected.id, "lesson", {
                      moduleId: lessonModule,
                      title: lessonTitle,
                      body: lessonBody,
                      videoUrl: lessonVideo,
                      sortOrder: modules.find((module) => module.id === lessonModule)?.course_lessons.length ?? 0,
                    }).then(() => {
                      setLessonTitle("");
                      setLessonBody("");
                      setLessonVideo("");
                    });
                  }}
                >
                  <select className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" value={lessonModule} onChange={(event) => setLessonModule(event.target.value)}>
                    <option value="">Select module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>{module.title}</option>
                    ))}
                  </select>
                  <Input value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} placeholder="Lesson title" required />
                  <Textarea value={lessonBody} onChange={(event) => setLessonBody(event.target.value)} placeholder="Lesson text" />
                  <Input value={lessonVideo} onChange={(event) => setLessonVideo(event.target.value)} placeholder="Video URL (optional)" />
                  <Button type="submit" variant="outline" disabled={!!busy || !lessonModule}>Add lesson</Button>
                </form>
                <div className="mt-3 space-y-3">
                  {modules.map((module) => (
                    <div key={module.id}>
                      <p className="text-sm font-semibold">{module.title}</p>
                      <ul className="mt-1 space-y-1 pl-3 text-sm text-[#6B7280]">
                        {(module.course_lessons ?? []).map((lesson) => (
                          <li key={lesson.id}>{lesson.title}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

                <div className="border-t border-[#E5E7EB] pt-4">
                <h2 className="text-sm font-semibold">Quiz and assignment</h2>
                <form
                  className="mt-2 grid gap-2 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    const lessonId = String(data.get("lessonId") ?? "");
                    void run(selected.id, "quiz", {
                      lessonId,
                      title: String(data.get("quizTitle") ?? "Quiz"),
                      passScore: 70,
                      questions: [{
                        prompt: String(data.get("prompt") ?? ""),
                        options: String(data.get("options") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
                        correctAnswer: String(data.get("answer") ?? ""),
                      }],
                    });
                    form.reset();
                  }}
                >
                  <select name="lessonId" className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm" required>
                    <option value="">Lesson for quiz</option>
                    {modules.flatMap((module) => module.course_lessons ?? []).map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                  <Input name="quizTitle" placeholder="Quiz title" required />
                  <Input name="prompt" placeholder="Question" required />
                  <Input name="options" placeholder="Options, comma separated" required />
                  <Input name="answer" placeholder="Correct option" required />
                  <Button type="submit" variant="outline" disabled={!!busy}>Save quiz</Button>
                </form>
                <form
                  className="mt-2 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    void run(selected.id, "assignment", {
                      title: String(data.get("assignmentTitle") ?? ""),
                      instructions: String(data.get("instructions") ?? ""),
                      lessonId: String(data.get("assignmentLesson") ?? "") || undefined,
                    });
                    form.reset();
                  }}
                >
                  <Input name="assignmentTitle" placeholder="Assignment title" required />
                  <Input name="instructions" placeholder="Instructions" />
                  <select name="assignmentLesson" className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm">
                    <option value="">Lesson (optional)</option>
                    {modules.flatMap((module) => module.course_lessons ?? []).map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" disabled={!!busy}>Add assignment</Button>
                </form>
              </div>

              <div className="border-t border-[#E5E7EB] pt-4">
                <h2 className="text-sm font-semibold">Students</h2>
                {roster.length === 0 ? (
                  <p className="mt-2 text-sm text-[#6B7280]">No enrollments yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#E5E7EB] text-sm">
                    {roster.map((row) => (
                      <li key={String(row.id)} className="flex justify-between py-2">
                        <span>{String((row.profiles as { full_name?: string } | null)?.full_name ?? row.user_id)}</span>
                        <span>{String(row.progress ?? 0)}% · {String(row.status)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {submissions.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {submissions.map((submission) => (
                      <li key={String(submission.id)} className="rounded-xl border border-[#E5E7EB] p-3 text-sm">
                        <p>{String(submission.body)}</p>
                        <p className="mt-1 text-[#6B7280]">{String(submission.status)} {submission.score != null ? `· ${submission.score}` : ""}</p>
                        {submission.status !== "graded" && (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              const score = window.prompt("Score (0-100)");
                              if (score == null) return;
                              void run(selected.id, "grade", { submissionId: submission.id, score: Number(score), feedback: "Reviewed" });
                            }}
                          >
                            Grade
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">Select a course to edit it.</p>
          )}
        </div>
      )}
    </div>
  );
}
