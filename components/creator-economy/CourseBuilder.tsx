"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Lesson = { id: string; title: string; module_id: string; sort_order: number };
type Module = { id: string; title: string; sort_order: number; course_lessons: Lesson[] };
type CourseTree = {
  id: string;
  title: string;
  certificate_enabled?: boolean;
  modules: Module[];
};

export function CourseBuilder({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseTree | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [quizLessonId, setQuizLessonId] = useState("");
  const [quizTitle, setQuizTitle] = useState("Lesson quiz");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/creator/courses/${courseId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load course");
    setCourse(data.course);
    const firstModule = data.course?.modules?.[0]?.id ?? "";
    const firstLesson = data.course?.modules?.[0]?.course_lessons?.[0]?.id ?? "";
    setModuleId((prev) => prev || firstModule);
    setQuizLessonId((prev) => prev || firstLesson);
  }, [courseId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function run(action: string, payload: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const endpoint =
        action === "module" || action === "lesson"
          ? "/api/creator/courses"
          : `/api/creator/courses/${courseId}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, courseId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessage(
        action === "module"
          ? "Module saved."
          : action === "lesson"
            ? "Lesson saved."
            : action === "quiz"
              ? "Quiz saved."
              : "Certificate issued."
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function addModule(e: FormEvent) {
    e.preventDefault();
    await run("module", { title: moduleTitle, sortOrder: course?.modules?.length ?? 0 });
    setModuleTitle("");
  }

  async function addLesson(e: FormEvent) {
    e.preventDefault();
    if (!moduleId) {
      setError("Create a module first");
      return;
    }
    await run("lesson", {
      moduleId,
      title: lessonTitle,
      sortOrder:
        course?.modules?.find((m) => m.id === moduleId)?.course_lessons?.length ?? 0,
    });
    setLessonTitle("");
  }

  async function addQuiz(e: FormEvent) {
    e.preventDefault();
    if (!quizLessonId) {
      setError("Add a lesson before creating a quiz");
      return;
    }
    await run("quiz", {
      lessonId: quizLessonId,
      title: quizTitle,
      passScore: 70,
      questions: [
        {
          prompt: "Sample question — replace in production",
          options: ["A", "B", "C"],
          correctAnswer: "A",
        },
      ],
    });
  }

  const lessons =
    course?.modules?.flatMap((module) =>
      (module.course_lessons ?? []).map((lesson) => ({
        ...lesson,
        moduleTitle: module.title,
      }))
    ) ?? [];

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {course?.title || "Course builder"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Build sections, lessons, quizzes, and certificates.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]">
          {message}
        </p>
      )}

      <form
        onSubmit={addModule}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Add section</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="module-title">
            Section title
          </label>
          <input
            id="module-title"
            required
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Section title"
            className="min-h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
          />
          <button
            disabled={!!busy}
            className="min-h-10 rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "module" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add section"}
          </button>
        </div>
      </form>

      <form
        onSubmit={addLesson}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Add lesson</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="sr-only" htmlFor="lesson-module">
            Section
          </label>
          <select
            id="lesson-module"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            className="min-h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
          >
            <option value="">Select section</option>
            {(course?.modules ?? []).map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
          <input
            required
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="Lesson title"
            className="min-h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
          />
          <button
            disabled={!!busy}
            className="min-h-10 rounded-lg border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50"
          >
            {busy === "lesson" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add lesson"}
          </button>
        </div>
      </form>

      <form
        onSubmit={addQuiz}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Add quiz</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={quizLessonId}
            onChange={(e) => setQuizLessonId(e.target.value)}
            className="min-h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
          >
            <option value="">Select lesson</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.moduleTitle}: {lesson.title}
              </option>
            ))}
          </select>
          <input
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Quiz title"
            className="min-h-10 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm"
          />
          <button
            disabled={!!busy}
            className="min-h-10 rounded-lg border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50"
          >
            {busy === "quiz" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save quiz"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Course outline</h2>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void run("certificate", {})}
            className="min-h-10 rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold disabled:opacity-50"
          >
            Issue certificate (for yourself when complete)
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {(course?.modules ?? []).map((module) => (
            <div key={module.id}>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{module.title}</p>
              <ul className="mt-1 space-y-1 pl-3">
                {(module.course_lessons ?? []).map((lesson) => (
                  <li key={lesson.id} className="text-sm text-[var(--color-text-muted)]">
                    {lesson.title}
                  </li>
                ))}
                {!module.course_lessons?.length && (
                  <li className="text-sm text-[var(--color-text-muted)]">No lessons yet</li>
                )}
              </ul>
            </div>
          ))}
          {!course?.modules?.length && (
            <p className="text-sm text-[var(--color-text-muted)]">No sections yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
