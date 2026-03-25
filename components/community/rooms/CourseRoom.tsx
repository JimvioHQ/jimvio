"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatRoomMembersAside } from "@/components/community/chat/chat-room-members-aside";
import { useWorkspace } from "@/components/community/workspace-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function youtubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
    }
    const v = u.searchParams.get("v");
    if (u.hostname.includes("youtube") && v) return `https://www.youtube.com/embed/${v}`;
  } catch {
    /* ignore */
  }
  return url;
}

type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  duration: number | null;
  sort_order: number | null;
  is_free: boolean | null;
  attachments: unknown;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number | null;
  course_lessons: Lesson[];
};

type CoursePayload = {
  id: string;
  title: string;
  description: string | null;
  room_id: string;
  course_modules: Module[];
};

export function CourseRoom({ roomId, communityId }: { roomId: string; roomName: string; communityId: string; slug: string }) {
  const { userId } = useWorkspace();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [course, setCourse] = useState<CoursePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [marking, setMarking] = useState(false);
  const [openModule, setOpenModule] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${roomId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCourse(data.course ?? null);
    } catch {
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const flatLessons = useMemo(() => {
    if (!course) return [];
    const mods = [...(course.course_modules ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const list: Lesson[] = [];
    for (const m of mods) {
      const ls = [...(m.course_lessons ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      list.push(...ls);
    }
    return list;
  }, [course]);

  useEffect(() => {
    if (!course || flatLessons.length === 0) return;
    if (!activeLessonId) setActiveLessonId(flatLessons[0].id);
  }, [course, flatLessons, activeLessonId]);

  useEffect(() => {
    let cancelled = false;
    async function loadProgress() {
      if (!course) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("course_id", course.id)
        .eq("user_id", user.id);
      if (cancelled || !data) return;
      const map: Record<string, boolean> = {};
      data.forEach((r) => {
        map[r.lesson_id] = !!r.is_completed;
      });
      setProgress(map);
    }
    loadProgress();
    return () => {
      cancelled = true;
    };
  }, [course]);

  const activeLesson = flatLessons.find((l) => l.id === activeLessonId) ?? null;
  const completedCount = flatLessons.filter((l) => progress[l.id]).length;

  const idx = activeLesson ? flatLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const prevLesson = idx > 0 ? flatLessons[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < flatLessons.length - 1 ? flatLessons[idx + 1] : null;

  async function markComplete() {
    if (!activeLesson) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/lessons/${activeLesson.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchTime: 0 }),
      });
      if (!res.ok) return;
      setProgress((p) => ({ ...p, [activeLesson.id]: true }));
    } finally {
      setMarking(false);
    }
  }

  const videoRef = React.useRef<HTMLVideoElement>(null);

  function onVideoTime() {
    const el = videoRef.current;
    if (!el || !activeLesson?.video_url) return;
    const pct = el.duration > 0 ? el.currentTime / el.duration : 0;
    if (pct >= 0.8 && !progress[activeLesson.id]) {
      fetch(`/api/courses/lessons/${activeLesson.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchTime: Math.round(el.currentTime) }),
      }).then(() => {
        if (activeLesson) setProgress((p) => ({ ...p, [activeLesson.id]: true }));
      });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-[var(--color-text-muted)]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!course || flatLessons.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-muted)]">
        No course published for this room yet.
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      <div className="flex max-h-[40vh] w-full shrink-0 flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r">
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-black leading-tight text-[var(--color-text-primary)]">{course.title}</h2>
              {course.description && <p className="mt-1 line-clamp-3 text-xs text-[var(--color-text-muted)]">{course.description}</p>}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl border-[var(--color-border)] xl:hidden"
              aria-label="People — message members"
              onClick={() => setPeopleOpen(true)}
            >
              <Users className="h-4 w-4 text-[var(--color-accent)]" />
            </Button>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] rounded-full transition-all"
              style={{ width: `${flatLessons.length ? (completedCount / flatLessons.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1">
            {completedCount} of {flatLessons.length} lessons completed
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {[...(course.course_modules ?? [])]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((mod) => {
              const open = openModule[mod.id] !== false;
              const lessons = [...(mod.course_lessons ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              return (
                <div key={mod.id} className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-surface-secondary)] text-left"
                    onClick={() => setOpenModule((o) => ({ ...o, [mod.id]: !open }))}
                  >
                    <span className="text-xs font-black text-[var(--color-text-primary)] truncate">{mod.title}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{lessons.length} lessons</span>
                  </button>
                  {open && (
                    <ul className="divide-y divide-[var(--color-border)]">
                      {lessons.map((les) => (
                        <li key={les.id}>
                          <button
                            type="button"
                            onClick={() => setActiveLessonId(les.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2",
                              activeLessonId === les.id ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "hover:bg-[var(--color-surface-secondary)]"
                            )}
                          >
                            {progress[les.id] ? <Check className="h-3.5 w-3.5 text-[var(--color-success)] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate">{les.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-bg)]">
        {activeLesson && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <h3 className="text-xl font-black text-[var(--color-text-primary)]">{activeLesson.title}</h3>
              {activeLesson.video_url ? (
                activeLesson.video_url.includes("youtube.com") || activeLesson.video_url.includes("youtu.be") ? (
                  <div className="aspect-video rounded-2xl overflow-hidden border border-[var(--color-border)] bg-black">
                    <iframe src={youtubeEmbedUrl(activeLesson.video_url)} className="w-full h-full" title="Video" allowFullScreen />
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={activeLesson.video_url}
                    controls
                    className="w-full rounded-2xl border border-[var(--color-border)] max-h-[420px] bg-black"
                    onTimeUpdate={onVideoTime}
                  />
                )
              ) : (
                <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap">{activeLesson.body || "No content."}</div>
              )}
              {activeLesson.body && activeLesson.video_url && (
                <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap">{activeLesson.body}</div>
              )}
            </div>
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap gap-2 justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[var(--color-border)]"
                disabled={!prevLesson}
                onClick={() => prevLesson && setActiveLessonId(prevLesson.id)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
                disabled={marking || progress[activeLesson.id]}
                onClick={markComplete}
              >
                {progress[activeLesson.id] ? "Completed" : marking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Complete"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[var(--color-border)]"
                disabled={!nextLesson}
                onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
        </div>

        <ChatRoomMembersAside
          communityId={communityId}
          userId={userId}
          threadOpen={false}
          mobilePeopleOpen={peopleOpen}
          onMobilePeopleOpenChange={setPeopleOpen}
          desktopBreakpoint="xl"
        />
      </div>
    </div>
  );
}
