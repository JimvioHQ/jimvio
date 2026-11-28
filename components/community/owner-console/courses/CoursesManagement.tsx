"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
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
  total_lessons: number | null;\n  total_modules?: number | null;
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

type Lesson = {
  id: string;
  title: string;
  module_id: string;
  body?: string | null;
  video_url?: string | null;
  duration?: number | null;
  is_free?: boolean | null;
  sort_order?: number;
  attachments?: Array<{ url?: string }>;
};
type Module = { id: string; title: string; sort_order?: number; course_lessons: Lesson[] };
type Assignment = {
  id: string;
  title: string;
  instructions: string | null;
  lesson_id: string | null;
  required: boolean;
  pass_score: number;
};
type QuizQuestion = { prompt: string; options: string[]; correctAnswer: string };
type ManagedQuiz = {
  id: string;
  lesson_id: string;
  title: string;
  pass_score: number;
  questions: QuizQuestion[];
};

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
  const [newDescription, setNewDescription] = useState("");
  const [newCover, setNewCover] = useState("");
  const [newLevel, setNewLevel] = useState("beginner");
  const [newPaid, setNewPaid] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonBody, setLessonBody] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");\n  const [lessonDuration, setLessonDuration] = useState("0");\n  const [lessonIsFree, setLessonIsFree] = useState(false);
  const [lessonResource, setLessonResource] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [lessonModule, setLessonModule] = useState("");
  const [roster, setRoster] = useState<Array<Record<string, unknown>>>([]);
  const [submissions, setSubmissions] = useState<Array<Record<string, unknown>>>([]);\n  const [assignments, setAssignments] = useState<Assignment[]>([]);\n  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<ManagedQuiz[]>([]);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizLessonId, setQuizLessonId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizPassScore, setQuizPassScore] = useState("70");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([{ prompt: "", options: [], correctAnswer: "" }]);

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
  }, [community?.id]);

  const loadCourse = useCallback(async (courseId: string) => {
    const res = await fetch(`/api/c/owner/courses/${courseId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Could not load course");
    const tree = (json.course?.modules ?? []) as Module[];
    setModules(tree);
    setLessonModule(tree[0]?.id ?? "");
    setRoster(json.roster?.enrollments ?? []);
    setSubmissions(json.roster?.submissions ?? []);\n    setAssignments(json.assignments ?? []);
    setQuizzes(json.quizzes ?? []);
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
      toast.success(action.startsWith("delete") ? "Deleted successfully" : "Saved successfully");
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
    if (newPaid && !(Number(newPrice) > 0)) {
      toast.error("Enter a price for a paid course");
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
      const dollars = Number(newPrice);
      const details: Record<string, unknown> = { difficulty: newLevel };
      if (newDescription.trim()) details.description = newDescription.trim();
      if (newCover.trim()) details.thumbnail_url = newCover.trim();
      if (newPaid && Number.isFinite(dollars) && dollars > 0) {
        details.price_cents = Math.round(dollars * 100);
        details.currency = "USD";
      }
      const detailsResponse = await fetch(`/api/c/owner/courses/${json.course.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ...details }),
      });
      const detailsResult = await detailsResponse.json().catch(() => ({}));
      if (!detailsResponse.ok) {
        throw new Error(detailsResult.error ?? "Course was created, but its details could not be saved. Reopen the draft and try again.");
      }
      setTitle("");
      setNewDescription("");
      setNewCover("");
      setNewPaid(false);
      setNewPrice("");
      setCreating(false);
      toast.success("Course draft created — add modules and lessons, then publish");
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

  async function shiftModule(moduleId: string, direction: -1 | 1) {
    if (!selected) return;
    const ordered = [...modules].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = ordered.findIndex((item) => item.id === moduleId);
    const current = ordered[index];
    const neighbor = ordered[index + direction];
    if (!current || !neighbor) return;
    const first = await run(selected.id, "module", {
      id: current.id,
      title: current.title,
      sortOrder: neighbor.sort_order ?? index + direction,
    });
    if (!first) return;
    await run(selected.id, "module", {
      id: neighbor.id,
      title: neighbor.title,
      sortOrder: current.sort_order ?? index,
    });
  }

  async function shiftLesson(module: Module, lesson: Lesson, direction: -1 | 1) {
    if (!selected) return;
    const ordered = [...(module.course_lessons ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = ordered.findIndex((item) => item.id === lesson.id);
    const neighbor = ordered[index + direction];
    if (!neighbor) return;
    const first = await run(selected.id, "lesson", {
      id: lesson.id,
      moduleId: module.id,
      title: lesson.title,
      body: lesson.body ?? "",
      videoUrl: lesson.video_url ?? "",
      duration: lesson.duration ?? 0,
      isFree: Boolean(lesson.is_free),
      attachments: lesson.attachments ?? [],
      sortOrder: neighbor.sort_order ?? index + direction,
    });
    if (!first) return;
    await run(selected.id, "lesson", {
      id: neighbor.id,
      moduleId: module.id,
      title: neighbor.title,
      body: neighbor.body ?? "",
      videoUrl: neighbor.video_url ?? "",
      duration: neighbor.duration ?? 0,
      isFree: Boolean(neighbor.is_free),
      attachments: neighbor.attachments ?? [],
      sortOrder: lesson.sort_order ?? index,
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5A1F]">Jimvio Learning</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">Course Studio</h1>
          <p className="mt-1 max-w-xl text-sm text-[#6B7280]">Create structured learning experiences, manage lessons and assignments, and preview exactly what students will see.</p>
        </div>
        {!creating && (
          <Button type="button" className="bg-[#FF5A1F] hover:bg-[#F04E14]" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create course
          </Button>
        )}
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-[12px] font-semibold text-[#6B7280]">Courses</p>
          <p className="mt-1 text-2xl font-semibold text-[#111827]">{courses.length}</p>
        </div>
        {[
          ["Enrollments", analytics?.enrollments ?? 0],
          ["Completion", `${analytics?.completionRate ?? 0}%`],
          ["Revenue", `${((analytics?.revenueCents ?? 0) / 100).toFixed(2)}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-[12px] font-semibold text-[#6B7280]">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#111827]">{value}</p>
          </div>
        ))}
      </div>

      {creating ? (
        <form
          className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void createCourse();
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#111827]">Create a course</h2>
            <button type="button" className="text-sm font-semibold text-[#6B7280]" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
          <label className="block text-sm font-medium text-[#111827]">
            Course title
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Forex basics in 7 days" required minLength={3} />
          </label>
          <label className="block text-sm font-medium text-[#111827]">
            What will students learn?
            <Textarea className="mt-1" rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="A short description shown on the course page" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm font-medium text-[#111827]">
              Cover image
              <div className="mt-1 flex items-center gap-3">
                {newCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={newCover} alt="" className="h-14 w-24 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-24 items-center justify-center rounded-lg bg-[#F3F4F6] text-[11px] text-[#9CA3AF]">No cover</div>
                )}
                <CloudinaryUploadButton
                  folder="jimvio/communities"
                  buttonText={newCover ? "Change" : "Upload"}
                  onUploadSuccess={(url: string) => setNewCover(url)}
                />
              </div>
            </div>
            <label className="text-sm font-medium text-[#111827]">
              Level
              <select className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm" value={newLevel} onChange={(e) => setNewLevel(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <div className="text-sm font-medium text-[#111827]">
            Pricing
            <div className="mt-1 inline-flex rounded-xl border border-[#E5E7EB] p-1">
              {[
                { paid: false, label: "Free" },
                { paid: true, label: "Paid" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setNewPaid(opt.paid)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${newPaid === opt.paid ? "bg-[#FF5A1F] text-white" : "text-[#6B7280]"}`}
                  aria-pressed={newPaid === opt.paid}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {newPaid ? (
              <div className="mt-2 flex max-w-[220px] items-center rounded-md border border-[#E5E7EB] px-3">
                <span className="text-sm text-[#6B7280]">$</span>
                <input
                  type="number"
                  min={0.5}
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-10 w-full bg-transparent px-2 text-sm outline-none"
                  aria-label="Course price in USD"
                />
                <span className="text-xs text-[#9CA3AF]">USD</span>
              </div>
            ) : null}
          </div>
          <Button type="submit" className="bg-[#FF5A1F] hover:bg-[#F04E14]" disabled={busy === "create"}>
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create course
          </Button>
          <p className="text-xs text-[#6B7280]">It starts as a draft. Add modules and lessons, then publish it to members.</p>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button type="button" className="bg-[#FF5A1F] hover:bg-[#F04E14]" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New course
          </Button>
        </div>
      )}

      {loading ? (
        <div className="h-28 animate-pulse rounded-2xl bg-[#F3F4F6]" />
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center">
          <p className="font-semibold text-[#111827]">No courses yet</p>
          <p className="mt-1 text-sm text-[#6B7280]">Create a course, add lessons, then publish it to members.</p>
          {!creating ? (
            <Button type="button" className="mt-4 bg-[#FF5A1F] hover:bg-[#F04E14]" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Create your first course
            </Button>
          ) : null}
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
                <div className="text-sm font-medium">
                  Cover image
                  <div className="mt-1 flex items-center gap-3">
                    {selected.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selected.thumbnail_url} alt="" className="h-10 w-16 rounded-md object-cover" />
                    ) : null}
                    <CloudinaryUploadButton
                      folder="jimvio/communities"
                      buttonText={selected.thumbnail_url ? "Change cover" : "Upload cover"}
                      onUploadSuccess={(url: string) => void run(selected.id, "update", { thumbnail_url: url })}
                    />
                  </div>
                </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Curriculum</h2><p className="text-xs text-[#6B7280]">{modules.length} modules · {modules.reduce((total, module) => total + (module.course_lessons?.length ?? 0), 0)} lessons</p></div>
                  <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const editingModule = modules.find((module) => module.id === editingModuleId);
                    void run(selected.id, "module", {
                      id: editingModuleId ?? undefined,
                      title: moduleTitle,
                      sortOrder: editingModule?.sort_order ?? modules.length,
                    }).then((result) => {
                      if (result) {
                        setModuleTitle("");
                        setEditingModuleId(null);
                      }
                    });
                  }}
                >
                  <Input value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="Module title" required />
                  <Button type="submit" variant="outline" disabled={!!busy}>{editingModuleId ? "Save module" : "Add module"}</Button>
                </form>
                <form
                  className="mt-2 grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const editingLesson = modules
                      .flatMap((module) => module.course_lessons ?? [])
                      .find((lesson) => lesson.id === editingLessonId);
                    void run(selected.id, "lesson", {
                      id: editingLessonId ?? undefined,
                      moduleId: lessonModule,
                      title: lessonTitle,
                      body: lessonBody,
                      videoUrl: lessonVideo,
                      duration: Number(lessonDuration) || 0,
                      isFree: lessonIsFree,
                      attachments: lessonResource.trim()
                        ? [{ url: lessonResource.trim(), name: lessonTitle || "Resource", type: "file" }]
                        : editingLesson?.attachments ?? [],
                      sortOrder:
                        editingLesson?.sort_order ??
                        modules.find((module) => module.id === lessonModule)?.course_lessons.length ??
                        0,
                    }).then(() => {
                      setLessonTitle("");
                      setLessonBody("");
                      setLessonVideo("");
                      setLessonDuration("0");
                      setLessonIsFree(false);
                      setLessonResource("");
                      setEditingLessonId(null);
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
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <label className="text-xs font-medium text-[#6B7280]">Duration (minutes)
                      <Input type="number" min={0} max={10000} value={lessonDuration} onChange={(event) => setLessonDuration(event.target.value)} />
                    </label>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm">
                      <input type="checkbox" checked={lessonIsFree} onChange={(event) => setLessonIsFree(event.target.checked)} />
                      Free preview
                    </label>
                  </div>
                  <Input value={lessonResource} onChange={(event) => setLessonResource(event.target.value)} placeholder="Downloadable resource URL (optional)" />
                  <Button type="submit" variant="outline" disabled={!!busy || !lessonModule}>{editingLessonId ? "Save lesson" : "Add lesson"}</Button>
                </form>
                <div className="mt-3 space-y-3">
                  {modules.map((module) => (
                    <div key={module.id}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{module.title}</p>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label="Move module up" title="Move module up" disabled={!!busy || modules.findIndex((item) => item.id === module.id) === 0} className="text-xs text-[#6B7280] disabled:opacity-30" onClick={() => void shiftModule(module.id, -1)}>↑</button>
                          <button type="button" aria-label="Move module down" title="Move module down" disabled={!!busy || modules.findIndex((item) => item.id === module.id) === modules.length - 1} className="text-xs text-[#6B7280] disabled:opacity-30" onClick={() => void shiftModule(module.id, 1)}>↓</button>
                        </div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#FF5A1F]"
                          onClick={() => {
                            setEditingModuleId(module.id);
                            setModuleTitle(module.title);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ml-3 text-xs font-semibold text-red-600"
                          disabled={!!busy}
                          onClick={() => {
                            if (window.confirm("Delete this module and all its lessons?")) {
                              void run(selected.id, "deleteModule", { id: module.id });
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                      <ul className="mt-1 space-y-1 pl-3 text-sm text-[#6B7280]">
                        {(module.course_lessons ?? []).map((lesson) => (
                          <li key={lesson.id} className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1">{lesson.title}</span>
                            <button type="button" aria-label="Move lesson up" title="Move lesson up" disabled={!!busy || (module.course_lessons ?? []).findIndex((item) => item.id === lesson.id) === 0} className="text-xs text-[#6B7280] disabled:opacity-30" onClick={() => void shiftLesson(module, lesson, -1)}>↑</button>
                            <button type="button" aria-label="Move lesson down" title="Move lesson down" disabled={!!busy || (module.course_lessons ?? []).findIndex((item) => item.id === lesson.id) === (module.course_lessons ?? []).length - 1} className="text-xs text-[#6B7280] disabled:opacity-30" onClick={() => void shiftLesson(module, lesson, 1)}>↓</button>
                            <button
                              type="button"
                              className="text-xs font-semibold text-[#FF5A1F]"
                              onClick={() => {
                                setEditingLessonId(lesson.id);
                                setLessonModule(lesson.module_id);
                                setLessonTitle(lesson.title);
                                setLessonBody(lesson.body ?? "");
                                setLessonVideo(lesson.video_url ?? "");
                                setLessonDuration(String(lesson.duration ?? 0));
                                setLessonIsFree(Boolean(lesson.is_free));
                                setLessonResource(lesson.attachments?.find((file) => file.url)?.url ?? "");
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-xs font-semibold text-red-600"
                              disabled={!!busy}
                              onClick={() => {
                                if (window.confirm("Delete this lesson? Its quiz will also be removed and linked assignments will become course-level assignments.")) {
                                  void run(selected.id, "deleteLesson", { id: lesson.id }).then((result) => {
                                    if (result && editingLessonId === lesson.id) {
                                      setEditingLessonId(null);
                                      setLessonTitle("");
                                      setLessonBody("");
                                      setLessonVideo("");
                                      setLessonDuration("0");
                                      setLessonIsFree(false);
                                      setLessonResource("");
                                    }
                                  });
                                }
                              }}
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

                <div className="border-t border-[#E5E7EB] pt-4">
                <h2 className="text-sm font-semibold">Quiz and assignment</h2>
                <form
                  className="mt-2 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const normalized = quizQuestions.map((question) => ({
                      prompt: question.prompt.trim(),
                      options: question.options.map((option) => option.trim()).filter(Boolean),
                      correctAnswer: question.correctAnswer.trim(),
                    }));
                    if (!quizLessonId || !quizTitle.trim() || normalized.some((question) =>
                      !question.prompt || question.options.length < 2 || !question.options.includes(question.correctAnswer)
                    )) {
                      toast.error("Each question needs a prompt, at least two options, and a correct answer from those options.");
                      return;
                    }
                    void run(selected.id, "quiz", {
                      lessonId: quizLessonId,
                      title: quizTitle.trim(),
                      passScore: Number(quizPassScore) || 70,
                      questions: normalized,
                    }).then((result) => {
                      if (result) {
                        setEditingQuizId(null);
                        setQuizLessonId("");
                        setQuizTitle("");
                        setQuizPassScore("70");
                        setQuizQuestions([{ prompt: "", options: [], correctAnswer: "" }]);
                      }
                    });
                  }}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
                      value={quizLessonId}
                      onChange={(event) => setQuizLessonId(event.target.value)}
                      disabled={!!editingQuizId}
                      required
                    >
                      <option value="">Lesson for quiz</option>
                      {modules.flatMap((module) => module.course_lessons ?? []).map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                      ))}
                    </select>
                    <Input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="Quiz title" required />
                    <label className="text-xs font-medium text-[#6B7280]">Pass score (%)
                      <Input type="number" min={0} max={100} value={quizPassScore} onChange={(event) => setQuizPassScore(event.target.value)} />
                    </label>
                  </div>
                  {quizQuestions.map((question, index) => (
                    <div key={index} className="space-y-2 rounded-xl border border-[#E5E7EB] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Question {index + 1}</p>
                        {quizQuestions.length > 1 && (
                          <button type="button" className="text-xs font-semibold text-red-600" onClick={() => setQuizQuestions((items) => items.filter((_, i) => i !== index))}>Remove</button>
                        )}
                      </div>
                      <Input value={question.prompt} onChange={(event) => setQuizQuestions((items) => items.map((item, i) => i === index ? { ...item, prompt: event.target.value } : item))} placeholder="Question" required />
                      <Input
                        value={question.options.join(", ")}
                        onChange={(event) => setQuizQuestions((items) => items.map((item, i) => i === index ? { ...item, options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) } : item))}
                        placeholder="Options, separated by commas"
                        required
                      />
                      <select
                        className="h-10 w-full rounded-md border border-[#E5E7EB] px-3 text-sm"
                        value={question.correctAnswer}
                        onChange={(event) => setQuizQuestions((items) => items.map((item, i) => i === index ? { ...item, correctAnswer: event.target.value } : item))}
                        required
                      >
                        <option value="">Choose correct answer</option>
                        {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setQuizQuestions((items) => [...items, { prompt: "", options: [], correctAnswer: "" }])}>Add question</Button>
                    <Button type="submit" variant="outline" disabled={!!busy}>{editingQuizId ? "Save quiz" : "Create quiz"}</Button>
                    {editingQuizId && <Button type="button" variant="ghost" onClick={() => { setEditingQuizId(null); setQuizLessonId(""); setQuizTitle(""); setQuizPassScore("70"); setQuizQuestions([{ prompt: "", options: [], correctAnswer: "" }]); }}>Cancel edit</Button>}
                  </div>
                </form>
                {quizzes.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {quizzes.map((quiz) => (
                      <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{quiz.title}</p>
                          <p className="text-xs text-[#6B7280]">{quiz.questions?.length ?? 0} questions · Pass {quiz.pass_score}%</p>
                        </div>
                        <div className="flex gap-3">
                          <button type="button" className="text-xs font-semibold text-[#FF5A1F]" onClick={() => {
                            setEditingQuizId(quiz.id);
                            setQuizLessonId(quiz.lesson_id);
                            setQuizTitle(quiz.title);
                            setQuizPassScore(String(quiz.pass_score));
                            setQuizQuestions((quiz.questions ?? []).map((question) => ({
                              prompt: question.prompt ?? "",
                              options: question.options ?? [],
                              correctAnswer: question.correctAnswer ?? "",
                            })));
                          }}>Edit</button>
                          <button type="button" className="text-xs font-semibold text-red-600" disabled={!!busy} onClick={() => {
                            if (window.confirm("Delete this quiz? Quizzes with student attempts are protected.")) void run(selected.id, "deleteQuiz", { id: quiz.id });
                          }}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  className="mt-2 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    void run(selected.id, "assignment", {
                      id: editingAssignmentId ?? undefined,
                      title: String(data.get("assignmentTitle") ?? ""),
                      instructions: String(data.get("instructions") ?? ""),
                      required: String(data.get("assignmentRequired") ?? "true") === "true",
                      passScore: Number(data.get("assignmentPassScore") ?? 70),
                      lessonId: String(data.get("assignmentLesson") ?? "") || undefined,
                    }).then((result) => {
                      if (result) {
                        form.reset();
                        setEditingAssignmentId(null);
                      }
                    });
                  }}
                >
                  <Input
                    name="assignmentTitle"
                    placeholder="Assignment title"
                    defaultValue={assignments.find((item) => item.id === editingAssignmentId)?.title ?? ""}
                    key={editingAssignmentId ?? "new-assignment-title"}
                    required
                  />
                  <Input
                    name="instructions"
                    placeholder="Instructions"
                    defaultValue={assignments.find((item) => item.id === editingAssignmentId)?.instructions ?? ""}
                    key={editingAssignmentId ?? "new-assignment-instructions"}
                  />
                  <select
                    name="assignmentRequired"
                    className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
                    defaultValue={String(assignments.find((item) => item.id === editingAssignmentId)?.required ?? true)}
                    key={editingAssignmentId ?? "new-assignment-required"}
                  >
                    <option value="true">Required</option>
                    <option value="false">Optional</option>
                  </select>
                  <Input
                    name="assignmentPassScore"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Pass score (%)"
                    defaultValue={String(assignments.find((item) => item.id === editingAssignmentId)?.pass_score ?? 70)}
                    key={editingAssignmentId ?? "new-assignment-pass-score"}
                  />
                  <select
                    name="assignmentLesson"
                    className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
                    defaultValue={assignments.find((item) => item.id === editingAssignmentId)?.lesson_id ?? ""}
                    key={editingAssignmentId ?? "new-assignment-lesson"}
                  >
                    <option value="">Course-level assignment</option>
                    {modules.flatMap((module) => module.course_lessons ?? []).map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" disabled={!!busy}>
                    {editingAssignmentId ? "Save assignment" : "Add assignment"}
                  </Button>
                  {editingAssignmentId && (
                    <Button type="button" variant="ghost" onClick={() => setEditingAssignmentId(null)}>
                      Cancel edit
                    </Button>
                  )}
                </form>
                {assignments.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {assignments.map((assignment) => (
                      <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111827]">{assignment.title}</p>
                          <p className="text-xs text-[#6B7280]">
                            {assignment.lesson_id
                              ? modules.flatMap((module) => module.course_lessons ?? []).find((lesson) => lesson.id === assignment.lesson_id)?.title ?? "Lesson linked"
                              : "Course-level"} · {assignment.required ? "Required" : "Optional"} · Pass {assignment.pass_score}%
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="text-xs font-semibold text-[#FF5A1F]" onClick={() => setEditingAssignmentId(assignment.id)}>Edit</button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-600"
                            disabled={!!busy}
                            onClick={() => {
                              if (window.confirm("Delete this assignment? Student submissions are protected and will prevent deletion.")) {
                                void run(selected.id, "deleteAssignment", { id: assignment.id });
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
