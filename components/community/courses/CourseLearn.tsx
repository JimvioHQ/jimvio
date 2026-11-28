"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { safeHttpUrl } from "@/lib/community/courses/rules";

type Lesson = {
  id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  duration: number | null;
  sort_order: number | null;
  attachments: unknown;
};
type Module = { id: string; title: string; sort_order: number | null; course_lessons: Lesson[] };
type Quiz = { id: string; lesson_id: string; title: string; questions: Array<{ prompt?: string; options?: string[] }>; pass_score: number };
type Assignment = { id: string; title: string; instructions: string | null; lesson_id: string | null; required?: boolean };
type Submission = { assignment_id: string; status: string; score: number | null; feedback: string | null };

export function CourseLearn({ courseId, communitySlug }: { courseId: string; communitySlug: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Course");
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [assignmentBodies, setAssignmentBodies] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/c/courses/${courseId}/learn`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Could not open course");
          return;
        }
        const nextModules = (json.modules ?? []) as Module[];
        nextModules.forEach((moduleRow) => {
          moduleRow.course_lessons = [...(moduleRow.course_lessons ?? [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          );
        });
        setModules(nextModules.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
        setQuizzes(json.quizzes ?? []);
        setAssignments(json.assignments ?? []);
        setSubmissions(json.submissions ?? []);
        const map: Record<string, boolean> = {};
        for (const row of json.progress?.progress ?? []) {
          if (row.is_completed) map[row.lesson_id] = true;
        }
        setCompleted(map);
        setTitle(json.course?.title ?? "Course");
        setCertificateEnabled(Boolean(json.course?.certificate_enabled));
        const first = nextModules.flatMap((moduleRow) => moduleRow.course_lessons)[0];
        setActiveId(first?.id ?? null);
      } catch {
        if (!cancelled) setError("A network error prevented this course from loading. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    setAnswers({});
    setQuizResult(null);
  }, [activeId]);

  const lessons = useMemo(() => modules.flatMap((module) => module.course_lessons), [modules]);
  const index = lessons.findIndex((lesson) => lesson.id === activeId);
  const lesson = lessons[index] ?? null;
  const quiz = quizzes.find((item) => item.lesson_id === lesson?.id) ?? null;
  const visibleAssignments = [
    ...assignments.filter((item) => item.lesson_id === lesson?.id),
    ...(index === lessons.length - 1 ? assignments.filter((item) => !item.lesson_id) : []),
  ];

  async function markComplete(lessonId: string) {
    try {
      const res = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(json.error ?? "Could not save progress");
        return;
      }
      setCompleted((current) => ({ ...current, [lessonId]: true }));
      setNotice("Lesson marked complete");
    } catch {
      setNotice("A network error prevented progress from saving. Please try again.");
    }
  }

  async function submitQuiz() {
    if (!quiz || submittingQuiz) return;
    const payload = quiz.questions.map((_, index) => answers[String(index)] ?? "");
    if (payload.some((answer) => !answer)) {
      setQuizResult("Please answer every question before submitting.");
      return;
    }
    setSubmittingQuiz(true);
    setQuizResult(null);
    try {
      const res = await fetch(`/api/c/courses/${courseId}/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quiz", quizId: quiz.id, answers: payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQuizResult(json.error ?? "Quiz failed");
        return;
      }
      setQuizResult(json.attempt?.passed ? `Passed · ${json.attempt.score}%` : `Score ${json.attempt?.score}% · need ${quiz.pass_score}%`);
    } catch {
      setQuizResult("A network error prevented your quiz from being submitted. Please try again.");
    } finally {
      setSubmittingQuiz(false);
    }
  }

  async function submitAssignment(assignment: Assignment) {
    const answer = (assignmentBodies[assignment.id] ?? "").trim();
    if (!answer) {
      setNotice("Please add your assignment response before submitting.");
      return;
    }
    setSubmittingAssignmentId(assignment.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/c/courses/${courseId}/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignment", assignmentId: assignment.id, body: answer }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(json.error ?? "Could not submit");
        return;
      }
      setSubmissions((current) => [...current.filter((item) => item.assignment_id !== assignment.id), json.submission]);
      setAssignmentBodies((current) => ({ ...current, [assignment.id]: "" }));
      setNotice("Assignment submitted successfully");
    } catch {
      setNotice("A network error prevented submission. Please try again.");
    } finally {
      setSubmittingAssignmentId(null);
    }
  }

  async function issueCertificate() {
    try {
      const res = await fetch(`/api/creator/courses/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "certificate" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(json.error ?? "Certificate not available yet");
        return;
      }
      setNotice(`Certificate ${json.certificate.certificate_code}`);
    } catch {
      setNotice("A network error prevented certificate generation. Please try again.");
    }
  }

  if (loading) return <div className="h-[70vh] animate-pulse bg-[#F3F4F6]" />;
  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold">{error}</p>
        <Link className="mt-3 inline-block text-sm font-semibold text-[#FF5A1F]" href={`/communities/${communitySlug}/courses/${courseId}`}>
          Back to course
        </Link>
      </div>
    );
  }

  const done = lessons.filter((item) => completed[item.id]).length;
  const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return (
    <div className="min-h-[80vh] bg-[#F8FAFC] lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-[#E5E7EB] bg-white p-5 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <Link href={`/communities/${communitySlug}/courses/${courseId}`} className="text-xs font-semibold text-[#6B7280] hover:text-[#FF5A1F]">← Course overview</Link>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A1F]">Your learning progress</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h1 className="text-lg font-semibold leading-snug text-[#111827]">{title}</h1>
          <span className="shrink-0 text-sm font-bold tabular-nums text-[#FF5A1F]">{percent}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-[#FF5A1F] transition-all" style={{ width: `${percent}%` }} /></div>
        <p className="mt-2 text-xs text-[#6B7280]">{done} of {lessons.length} lessons completed</p>
        <div className="mt-4 space-y-3">
          {modules.map((module) => (
            <div key={module.id}>
              <p className="text-xs font-semibold uppercase text-[#6B7280]">{module.title}</p>
              <ul className="mt-1 space-y-1">
                {module.course_lessons.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(item.id)}
                      className={`w-full rounded-lg px-2 py-2 text-left text-sm ${item.id === activeId ? "bg-[#FFF1EB] text-[#FF5A1F]" : "text-[#111827]"}`}
                    >
                      {completed[item.id] ? "✓ " : ""}{item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-7 lg:p-10">
        {notice && <p className="rounded-xl bg-[#FFF7F3] px-3 py-2 text-sm text-[#9A3412]">{notice}</p>}
        {lesson ? (
          <>
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-7"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A1F]">Lesson {index + 1} of {lessons.length}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">{lesson.title}</h2>{lesson.duration ? <p className="mt-2 text-sm text-[#6B7280]">{lesson.duration} minutes</p> : null}</div>
            {safeHttpUrl(lesson.video_url) && (
              <video className="aspect-video w-full rounded-2xl bg-black shadow-sm" controls playsInline preload="metadata" src={safeHttpUrl(lesson.video_url) ?? undefined} />
            )}
            {lesson.body && <div className="whitespace-pre-wrap text-sm leading-6 text-[#374151]">{lesson.body}</div>}
            {Array.isArray(lesson.attachments) && lesson.attachments.length > 0 && (
              <ul className="space-y-1 text-sm">
                {(lesson.attachments as Array<{ url?: string; name?: string }>).map((file) => {
                  const url = safeHttpUrl(file.url);
                  return url ? (
                    <li key={url}>
                      <a className="font-semibold text-[#FF5A1F]" href={url} target="_blank" rel="noreferrer">
                        {file.name || "Download resource"}
                      </a>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
            {quiz && (
              <form
                className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitQuiz();
                }}
              >
                <h3 className="font-semibold">{quiz.title}</h3>
                {quiz.questions.map((question, questionIndex) => (
                  <fieldset key={`${question.prompt}-${questionIndex}`}>
                    <legend className="text-sm font-medium">{question.prompt}</legend>
                    <div className="mt-1 space-y-1">
                      {(question.options ?? []).map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`q-${questionIndex}`}
                            value={option}
                            onChange={() => setAnswers((current) => ({ ...current, [String(questionIndex)]: option }))}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <button type="submit" disabled={submittingQuiz} className="h-10 rounded-xl bg-[#FF5A1F] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{submittingQuiz ? "Submitting…" : "Submit quiz"}</button>
                {quizResult && <p className="text-sm">{quizResult}</p>}
              </form>
            )}
            {visibleAssignments.map((assignment) => (
              <form
                key={assignment.id}
                className="space-y-2 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitAssignment(assignment);
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{assignment.title}</h3>
                  {assignment.required !== false && <span className="rounded-full bg-[#FFF1EB] px-2 py-1 text-[11px] font-semibold text-[#9A3412]">Required</span>}
                </div>
                {assignment.instructions && <p className="text-sm text-[#6B7280]">{assignment.instructions}</p>}
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#E5E7EB] p-3 text-sm"
                  value={assignmentBodies[assignment.id] ?? ""}
                  onChange={(event) => setAssignmentBodies((current) => ({ ...current, [assignment.id]: event.target.value }))}
                  required
                />
                <button type="submit" disabled={submittingAssignmentId === assignment.id} className="h-10 rounded-xl bg-[#FF5A1F] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{submittingAssignmentId === assignment.id ? "Submitting…" : "Submit assignment"}</button>
                {submissions.filter((item) => item.assignment_id === assignment.id).map((item) => (
                  <p key={item.assignment_id} className="text-sm text-[#6B7280]">
                    {item.status}{item.score != null ? ` · ${item.score}` : ""}{item.feedback ? ` · ${item.feedback}` : ""}
                  </p>
                ))}
              </form>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="h-10 rounded-xl border border-[#E5E7EB] px-4 text-sm" disabled={index <= 0} onClick={() => setActiveId(lessons[index - 1]?.id ?? null)}>Previous</button>
              <button type="button" disabled={Boolean(completed[lesson.id])} className="h-10 rounded-xl bg-[#FF5A1F] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void markComplete(lesson.id)}>{completed[lesson.id] ? "Completed" : "Mark complete"}</button>
              <button type="button" className="h-10 rounded-xl border border-[#E5E7EB] px-4 text-sm" disabled={index >= lessons.length - 1} onClick={() => setActiveId(lessons[index + 1]?.id ?? null)}>Next</button>
              {certificateEnabled && <button type="button" className="h-10 rounded-xl border border-[#E5E7EB] px-4 text-sm" onClick={() => void issueCertificate()}>Get certificate</button>}
            </div>
          </>
        ) : (
          <p className="text-sm text-[#6B7280]">This course has no lessons yet.</p>
        )}
      </main>
    </div>
  );
}
