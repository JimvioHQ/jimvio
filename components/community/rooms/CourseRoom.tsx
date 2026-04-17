"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check, ChevronLeft, ChevronRight, Loader2, Users, Pencil,
  Trash2, Plus, FileText, Paperclip, X, Download, Sparkles,
  Video, PlayCircle, BookOpen, Lock, ChevronDown, LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChatRoomMembersAside } from "@/components/community/chat/chat-room-members-aside";
import { useWorkspace, WorkspaceProvider } from "@/components/community/workspace-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";

type Attachment = { url: string; name: string; type: string; size?: string };

function youtubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
    const v = u.searchParams.get("v");
    if (u.hostname.includes("youtube") && v)
      return `https://www.youtube.com/embed/${v}`;
  } catch { /* ignore */ }
  return url;
}

type Lesson = {
  id: string; module_id: string; course_id: string; title: string;
  body: string | null; video_url: string | null; duration: number | null;
  sort_order: number | null; is_free: boolean | null;
  attachments: Attachment[] | null; media_mode: string | null;
  slideshow: Attachment[] | null;
};

type Module = {
  id: string; title: string; description: string | null;
  sort_order: number | null; course_lessons: Lesson[];
};

type CoursePayload = {
  id: string; title: string; description: string | null;
  room_id: string; course_modules: Module[];
};

export function CourseRoom({
  roomId, communityId, dashboardMode,
}: {
  roomId: string; roomName: string; communityId: string; slug: string; dashboardMode?: boolean;
}) {
  const { userId } = useWorkspace();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [course, setCourse] = useState<CoursePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [marking, setMarking] = useState(false);
  const [openModule, setOpenModule] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editingItem, setEditingItem] = useState<{ type: "course" | "module" | "lesson"; id: string; data: any } | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  // Mobile: "list" = sidebar, "lesson" = lesson player
  const [mobileView, setMobileView] = useState<"list" | "lesson">("list");
  const { membership, ownerId } = useWorkspace();
  const isStaff = membership?.role === "owner" || membership?.role === "admin" || ownerId === userId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${roomId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const c = data.course;
      if (c?.course_modules) {
        c.course_modules.forEach((m: any) => {
          m.course_lessons?.forEach((l: any) => {
            if (l.attachments && typeof l.attachments === "object" && !Array.isArray(l.attachments)) {
              l.slideshow = l.attachments.slideshow || [];
              l.media_mode = l.attachments.media_mode || "video";
              l.attachments = l.attachments.files || [];
            }
          });
        });
      }
      setCourse(c ?? null);
    } catch { setCourse(null); }
    finally { setLoading(false); }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentSlide(0); }, [activeLessonId]);

  const flatLessons = useMemo(() => {
    if (!course) return [];
    return [...(course.course_modules ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .flatMap((m) =>
        [...(m.course_lessons ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      );
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("course_id", course.id)
        .eq("user_id", user.id);
      if (cancelled || !data) return;
      const map: Record<string, boolean> = {};
      data.forEach((r) => { map[r.lesson_id] = !!r.is_completed; });
      setProgress(map);
    }
    loadProgress();
    return () => { cancelled = true; };
  }, [course]);

  const activeLesson = flatLessons.find((l) => l.id === activeLessonId) ?? null;
  const completedCount = flatLessons.filter((l) => progress[l.id]).length;
  const progressPct = flatLessons.length ? (completedCount / flatLessons.length) * 100 : 0;
  const idx = activeLesson ? flatLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const prevLesson = idx > 0 ? flatLessons[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < flatLessons.length - 1 ? flatLessons[idx + 1] : null;

  function selectLesson(id: string) {
    setActiveLessonId(id);
    setMobileView("lesson");
  }

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
    } finally { setMarking(false); }
  }

  const videoRef = React.useRef<HTMLVideoElement>(null);
  async function onVideoTime() {
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

  const addModule = async () => {
    if (!newModuleTitle.trim()) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/${roomId}/management`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "module", title: newModuleTitle.trim() }),
      });
      if (res.ok) { setNewModuleTitle(""); load(); }
    } finally { setMarking(false); }
  };

  const addLesson = async (moduleId: string) => {
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/${roomId}/management`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lesson", moduleId, title: "New Lesson" }),
      });
      if (res.ok) load();
    } finally { setMarking(false); }
  };

  const updateItem = async () => {
    if (!editingItem) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/${roomId}/management`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: editingItem.type, id: editingItem.id, ...editingItem.data }),
      });
      if (res.ok) { setEditingItem(null); load(); }
    } finally { setMarking(false); }
  };

  const deleteItem = async (type: "module" | "lesson", id: string) => {
    if (!confirm(`Delete this ${type}?`)) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/${roomId}/management?type=${type}&id=${id}`, { method: "DELETE" });
      if (res.ok) load();
    } finally { setMarking(false); }
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  /* ─── Empty State ─── */
  if (!editing && (!course || flatLessons.length === 0)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 flex-col gap-5 text-center">
        <div className="h-20 w-20 rounded-3xl bg-[var(--color-surface-secondary)] flex items-center justify-center">
          <BookOpen size={36} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <p className="font-bold text-[var(--color-text-primary)] text-base">No course yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Content will appear here once it is added.</p>
        </div>
        {isStaff && (
          <Button
            onClick={() => setEditing(true)}
            className="rounded-xl border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-bold"
            variant="outline"
          >
            Build Course
          </Button>
        )}
      </div>
    );
  }

  /* ─── Sidebar ─── */
  const sidebar = (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Course header */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-[var(--color-text-primary)] leading-tight truncate">
                {course?.title || "Course"}
              </h2>
              {isStaff && (
                <button
                  onClick={() => setEditing(!editing)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border transition-colors shrink-0",
                    editing
                      ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                  )}
                >
                  {editing ? "Done" : "Edit"}
                </button>
              )}
              {editing && course && (
                <button
                  onClick={() => setEditingItem({ type: "course", id: course.id, data: { title: course.title, description: course.description } })}
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
            {course?.description && (
              <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">{course.description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg xl:hidden"
            onClick={() => setPeopleOpen(true)}
          >
            <Users className="h-4 w-4 text-[var(--color-accent)]" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
            {completedCount} / {flatLessons.length} lessons completed
          </p>
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {[...(course?.course_modules ?? [])]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((mod) => {
            const open = openModule[mod.id] !== false;
            const lessons = [...(mod.course_lessons ?? [])].sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            );
            const modCompleted = lessons.filter((l) => progress[l.id]).length;

            return (
              <div key={mod.id} className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                {/* Module header */}
                <div className="flex items-center gap-1 px-3 py-2.5 bg-[var(--color-surface-secondary)]">
                  <button
                    className="flex-1 flex items-center justify-between gap-2 text-left min-w-0"
                    onClick={() => setOpenModule((o) => ({ ...o, [mod.id]: !open }))}
                  >
                    <span className="text-xs font-black text-[var(--color-text-primary)] truncate">{mod.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {modCompleted}/{lessons.length}
                      </span>
                      <ChevronDown
                        size={14}
                        className={cn("text-[var(--color-text-muted)] transition-transform", open && "rotate-180")}
                      />
                    </div>
                  </button>
                  {editing && (
                    <div className="flex gap-0.5 ml-1 shrink-0">
                      <button
                        onClick={() => setEditingItem({ type: "module", id: mod.id, data: mod })}
                        className="p-1.5 hover:bg-black/5 rounded-lg text-[var(--color-accent)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteItem("module", mod.id)}
                        className="p-1.5 hover:bg-black/5 rounded-lg text-[var(--color-danger)] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {open && (
                  <ul className="divide-y divide-[var(--color-border)]/50">
                    {lessons.map((les) => {
                      const isActive = activeLessonId === les.id;
                      const isDone = progress[les.id];
                      return (
                        <li key={les.id}>
                          <div
                            className={cn(
                              "flex items-center transition-colors",
                              isActive
                                ? "bg-[var(--color-accent-light)]"
                                : "hover:bg-[var(--color-surface-secondary)]/60"
                            )}
                          >
                            <button
                              onClick={() => selectLesson(les.id)}
                              className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left min-w-0"
                            >
                              <div
                                className={cn(
                                  "h-5 w-5 rounded-full shrink-0 flex items-center justify-center border",
                                  isDone
                                    ? "bg-[var(--color-success)] border-[var(--color-success)]"
                                    : isActive
                                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                                      : "border-[var(--color-border)]"
                                )}
                              >
                                {isDone ? (
                                  <Check size={11} className="text-white" />
                                ) : isActive ? (
                                  <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                                ) : null}
                              </div>
                              <span
                                className={cn(
                                  "text-xs font-semibold truncate",
                                  isActive
                                    ? "text-[var(--color-accent)]"
                                    : "text-[var(--color-text-primary)]"
                                )}
                              >
                                {les.title}
                              </span>
                            </button>
                            {editing && (
                              <div className="flex gap-0.5 pr-2">
                                <button
                                  onClick={() => setEditingItem({ type: "lesson", id: les.id, data: les })}
                                  className="p-1.5 hover:bg-black/5 rounded-lg text-[var(--color-accent)] transition-colors"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => deleteItem("lesson", les.id)}
                                  className="p-1.5 hover:bg-black/5 rounded-lg text-[var(--color-danger)] transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {editing && (
                      <li>
                        <button
                          onClick={() => addLesson(mod.id)}
                          className="w-full py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Plus size={12} /> Add Lesson
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}

        {editing && (
          <div className="mt-2 p-4 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest mb-2 block">
              New Module
            </label>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="e.g. Introduction to Trading"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addModule()}
                className="h-10 text-sm rounded-xl border-[var(--color-border)] bg-[var(--color-surface)]"
              />
              <Button
                onClick={addModule}
                disabled={!newModuleTitle.trim() || marking}
                className="h-10 rounded-xl bg-[var(--color-accent)] text-white font-bold text-xs w-full"
              >
                {marking ? <Loader2 className="animate-spin h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> Add Module</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Lesson Player ─── */
  const lessonPlayer = (
    <div className="flex flex-col h-full min-w-0 bg-[var(--color-bg)]">
      {activeLesson ? (
        <>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Mobile top bar */}
            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)] lg:hidden">
              <button
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1.5 text-[var(--color-accent)] font-semibold text-sm"
              >
                <ChevronLeft size={18} /> Lessons
              </button>
              <span className="text-[var(--color-border)] mx-1">/</span>
              <span className="text-xs font-semibold text-[var(--color-text-muted)] truncate flex-1">
                {activeLesson.title}
              </span>
              <button onClick={() => setPeopleOpen(true)}>
                <Users size={18} className="text-[var(--color-text-muted)]" />
              </button>
            </div>

            <div className="p-4 md:p-6 lg:p-8 space-y-5 max-w-4xl mx-auto w-full">
              {/* Desktop header */}
              <div className="hidden lg:flex items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-[var(--color-text-primary)] leading-tight">
                  {activeLesson.title}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {editing && (
                    <button
                      onClick={() => setEditingItem({ type: "lesson", id: activeLesson.id, data: activeLesson })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-accent)] text-[var(--color-accent)] text-[10px] font-black uppercase hover:bg-[var(--color-accent)] hover:text-white transition-all"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                  <button onClick={() => setPeopleOpen(true)} className="xl:hidden p-2 hover:bg-black/5 rounded-full text-[var(--color-text-muted)]">
                    <Users size={20} />
                  </button>
                </div>
              </div>

              {/* Mobile lesson title */}
              <h3 className="lg:hidden text-lg font-black text-[var(--color-text-primary)] leading-tight">
                {activeLesson.title}
                {editing && (
                  <button
                    onClick={() => setEditingItem({ type: "lesson", id: activeLesson.id, data: activeLesson })}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] text-[9px] font-black uppercase"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                )}
              </h3>

              {/* Media */}
              {activeLesson.video_url ? (
                activeLesson.video_url.includes("youtube.com") || activeLesson.video_url.includes("youtu.be") ? (
                  <div className="aspect-video rounded-2xl overflow-hidden border border-[var(--color-border)] bg-black shadow-lg">
                    <iframe
                      src={youtubeEmbedUrl(activeLesson.video_url)}
                      className="w-full h-full"
                      title="Video"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    key={activeLesson.video_url}
                    src={activeLesson.video_url}
                    controls
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-black shadow-lg max-h-[480px]"
                    onTimeUpdate={onVideoTime}
                  />
                )
              ) : activeLesson.slideshow && activeLesson.slideshow.length > 0 ? (
                <div className="bg-[var(--color-surface-secondary)] rounded-2xl overflow-hidden aspect-video relative group border border-[var(--color-border)] shadow-lg">
                  <img
                    src={activeLesson.slideshow[currentSlide]?.url}
                    className="h-full w-full object-contain"
                    alt=""
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
                      className="h-10 w-10 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/60 disabled:opacity-30"
                      disabled={currentSlide === 0}
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <span className="text-[11px] font-bold text-white px-3 py-1.5 bg-black/40 rounded-full backdrop-blur-md">
                      {currentSlide + 1} / {activeLesson.slideshow.length}
                    </span>
                    <button
                      onClick={() => setCurrentSlide((p) => Math.min((activeLesson.slideshow?.length || 1) - 1, p + 1))}
                      className="h-10 w-10 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/60 disabled:opacity-30"
                      disabled={currentSlide === (activeLesson.slideshow.length || 1) - 1}
                    >
                      <ChevronRight size={22} />
                    </button>
                  </div>
                  {/* Slide dots */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {activeLesson.slideshow.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={cn(
                          "rounded-full transition-all",
                          i === currentSlide ? "w-4 h-1.5 bg-white dark:bg-surface" : "w-1.5 h-1.5 bg-white dark:bg-surface/50"
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Body text */}
              {activeLesson.body && (
                <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {activeLesson.body}
                </div>
              )}

              {/* Attachments */}
              {activeLesson.attachments && activeLesson.attachments.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                    <Paperclip size={13} className="text-[var(--color-accent)]" /> Resources
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeLesson.attachments.map((file, i) => (
                      <a
                        key={i}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all group"
                      >
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-[var(--color-text-primary)]">{file.name}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{file.size || "Attachment"}</p>
                        </div>
                        <Download size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom nav bar */}
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[var(--color-border)] h-9 px-3"
              disabled={!prevLesson}
              onClick={() => prevLesson && selectLesson(prevLesson.id)}
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <Button
              size="sm"
              className={cn(
                "rounded-xl font-bold px-4 h-9 flex-1 max-w-[200px] transition-all",
                progress[activeLesson.id]
                  ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30 hover:bg-[var(--color-success)]/20"
                  : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
              )}
              disabled={marking || progress[activeLesson.id]}
              onClick={markComplete}
            >
              {progress[activeLesson.id] ? (
                <><Check className="h-4 w-4 mr-1" /> Completed</>
              ) : marking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Mark Complete"
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[var(--color-border)] h-9 px-3"
              disabled={!nextLesson}
              onClick={() => nextLesson && selectLesson(nextLesson.id)}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </>
      ) : (
        /* No lesson selected (desktop only) */
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-4">
            <Sparkles size={32} className="animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-[var(--color-text-primary)] mb-1">
            {editing ? "Your Canvas is Ready" : "Select a Lesson"}
          </h3>
          <p className="max-w-[280px] text-xs text-[var(--color-text-muted)] leading-relaxed">
            {editing
              ? "Add your first module in the sidebar to get started."
              : "Choose a lesson from the sidebar to begin."}
          </p>
        </div>
      )}
    </div>
  );

  /* ─── Studio Modal ─── */
  const studioModal = editingItem && (
    <div className="fixed inset-0 z-[20000] flex items-end sm:items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)} />

      <div className="relative w-full sm:max-w-4xl max-h-[95dvh] sm:max-h-[90vh] bg-[var(--color-surface)] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[var(--color-border)] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-white">
              <Pencil size={16} />
            </div>
            <div>
              <h3 className="font-black text-[var(--color-text-primary)] text-sm capitalize">
                Edit {editingItem.type}
              </h3>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Creator Studio</p>
            </div>
          </div>
          <button
            onClick={() => setEditingItem(null)}
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all text-[var(--color-text-muted)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            {/* Left: Text content */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Title</label>
                <Input
                  value={editingItem.data.title || ""}
                  onChange={(e) => setEditingItem((p) => p ? { ...p, data: { ...p.data, title: e.target.value } } : null)}
                  placeholder="e.g. Fundamental Trading Patterns"
                  className="h-12 rounded-xl text-base font-bold border-[var(--color-border)] bg-[var(--color-bg)]"
                />
              </div>

              {(editingItem.type === "module" || editingItem.type === "course") && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Description</label>
                  <Textarea
                    value={editingItem.data.description || ""}
                    onChange={(e) => setEditingItem((p) => p ? { ...p, data: { ...p.data, description: e.target.value } } : null)}
                    rows={8}
                    placeholder="Learning objectives for this section..."
                    className="rounded-xl border-[var(--color-border)] bg-[var(--color-bg)] resize-none"
                  />
                </div>
              )}

              {editingItem.type === "lesson" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Lesson Body</label>
                  <Textarea
                    value={editingItem.data.body || ""}
                    onChange={(e) => setEditingItem((p) => p ? { ...p, data: { ...p.data, body: e.target.value } } : null)}
                    rows={12}
                    placeholder="Full lesson content, notes, or step-by-step instructions..."
                    className="rounded-xl border-[var(--color-border)] bg-[var(--color-bg)] resize-none"
                  />
                </div>
              )}
            </div>

            {/* Right: Media & Assets (lesson only) */}
            {editingItem.type === "lesson" && (
              <div className="space-y-6">
                {/* Media mode tabs */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Media Type</label>
                  <div className="flex rounded-xl border border-[var(--color-border)] p-1 bg-[var(--color-surface-secondary)] gap-1">
                    {(["video", "manual", "slides"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setEditingItem((p) => p ? { ...p, data: { ...p.data, media_mode: mode } } : null)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all",
                          (editingItem.data.media_mode || "video") === mode
                            ? "bg-[var(--color-accent)] text-white shadow-sm"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        )}
                      >
                        {mode === "manual" ? "Upload" : mode}
                      </button>
                    ))}
                  </div>

                  {/* URL input */}
                  {(editingItem.data.media_mode || "video") === "video" && (
                    <div className="relative">
                      <Input
                        value={editingItem.data.video_url || ""}
                        onChange={(e) => setEditingItem((p) => p ? { ...p, data: { ...p.data, video_url: e.target.value } } : null)}
                        placeholder="Paste YouTube / Vimeo / MP4 URL"
                        className="h-11 rounded-xl border-[var(--color-border)] bg-[var(--color-bg)] pr-10"
                      />
                      <Video size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-accent)] opacity-50" />
                    </div>
                  )}

                  {/* Upload video */}
                  {editingItem.data.media_mode === "manual" && (
                    <button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "video/*";
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          setMarking(true);
                          try {
                            const res = await uploadCommunityChatFile(communityId, roomId, file);
                            setEditingItem((p) => p ? { ...p, data: { ...p.data, video_url: res.url } } : null);
                          } finally { setMarking(false); }
                        };
                        input.click();
                      }}
                      className="w-full h-20 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 flex flex-col items-center justify-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all"
                    >
                      {marking ? <Loader2 size={20} className="animate-spin" /> : (
                        <>
                          <PlayCircle size={22} />
                          <span className="text-[10px] font-bold uppercase">Upload MP4</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Slideshow */}
                  {editingItem.data.media_mode === "slides" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        {(editingItem.data.slideshow || []).map((img: Attachment, i: number) => (
                          <div key={i} className="aspect-square rounded-lg border bg-black/5 relative group overflow-hidden">
                            <img src={img.url} className="w-full h-full object-cover" alt="slide" />
                            <button
                              onClick={() => setEditingItem((p) => p ? { ...p, data: { ...p.data, slideshow: (p.data.slideshow as Attachment[]).filter((_, idx) => idx !== i) } } : null)}
                              className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.multiple = true;
                            input.onchange = async (e) => {
                              const files = (e.target as HTMLInputElement).files;
                              if (!files) return;
                              setMarking(true);
                              try {
                                const urls = [...(editingItem.data.slideshow || [])];
                                for (const f of Array.from(files)) {
                                  const res = await uploadCommunityChatFile(communityId, roomId, f);
                                  urls.push({ url: res.url, name: f.name, type: f.type });
                                }
                                setEditingItem((p) => p ? { ...p, data: { ...p.data, slideshow: urls } } : null);
                              } finally { setMarking(false); }
                            };
                            input.click();
                          }}
                          disabled={marking}
                          className="aspect-square rounded-lg border-2 border-dashed border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-accent)]/5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-[var(--color-text-muted)] transition-all"
                        >
                          {marking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
                        </button>
                      </div>
                      <p className="text-[10px] italic text-[var(--color-text-muted)] text-center">
                        Images will be shown as a slideshow
                      </p>
                    </div>
                  )}
                </div>

                {/* File attachments */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Attachments</label>
                    <span className="text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-full">
                      {(editingItem.data.attachments || []).length} files
                    </span>
                  </div>

                  {(editingItem.data.attachments || []).map((file: Attachment, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] group">
                      <FileText size={18} className="text-[var(--color-accent)] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-[var(--color-text-primary)]">{file.name}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{file.size || "Attachment"}</p>
                      </div>
                      <button
                        onClick={() => setEditingItem((p) => p ? { ...p, data: { ...p.data, attachments: (p.data.attachments as Attachment[]).filter((_, i) => i !== idx) } } : null)}
                        className="h-7 w-7 flex items-center justify-center hover:bg-red-500/10 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.onchange = async (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (!files) return;
                        setMarking(true);
                        try {
                          const newAtts = [...(editingItem.data.attachments || [])];
                          for (const file of Array.from(files)) {
                            const res = await uploadCommunityChatFile(communityId, roomId, file);
                            newAtts.push({ url: res.url, name: file.name, type: file.type, size: (file.size / 1024).toFixed(1) + " KB" });
                          }
                          setEditingItem((p) => p ? { ...p, data: { ...p.data, attachments: newAtts } } : null);
                        } finally { setMarking(false); }
                      };
                      input.click();
                    }}
                    disabled={marking}
                    className="w-full h-16 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all"
                  >
                    {marking ? <Loader2 size={18} className="animate-spin" /> : (
                      <><Paperclip size={18} /><span className="text-xs font-bold">Upload Files</span></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-3 justify-end bg-[var(--color-surface-secondary)]/30">
          <Button variant="outline" className="rounded-xl h-10" onClick={() => setEditingItem(null)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl h-10 bg-[var(--color-accent)] text-white font-bold px-6"
            onClick={updateItem}
            disabled={marking}
          >
            {marking ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );

  /* ─── Main layout ─── */
  return (
    <>
      {/* Desktop: side-by-side | Mobile: tab-switched views */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Sidebar — always visible on lg, toggled on mobile */}
        <div
          className={cn(
            "shrink-0 border-r border-[var(--color-border)]",
            // Mobile: full width when list view, hidden when lesson view
            "w-full lg:w-[300px] xl:w-[320px]",
            mobileView === "list" ? "flex flex-col" : "hidden lg:flex lg:flex-col",
            "h-full"
          )}
        >
          {sidebar}
        </div>

        {/* Player + chat aside */}
        <div
          className={cn(
            "flex-1 flex min-w-0 min-h-0",
            // Mobile: visible when lesson view, hidden when list view
            mobileView === "lesson" ? "flex" : "hidden lg:flex"
          )}
        >
          <div className="flex flex-col flex-1 min-w-0 min-h-0">{lessonPlayer}</div>
          {!dashboardMode && (
             <ChatRoomMembersAside
               communityId={communityId}
               userId={userId ?? ""}
               threadOpen={false}
               mobilePeopleOpen={peopleOpen}
               onMobilePeopleOpenChange={setPeopleOpen}
               desktopBreakpoint="xl"
             />
          )}
        </div>
      </div>

      {/* Mobile bottom tab bar — only show when not in editing modal */}
      {!editingItem && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] safe-area-bottom">
          <button
            onClick={() => setMobileView("list")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
              mobileView === "list"
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)]"
            )}
          >
            <LayoutList size={20} />
            Lessons
          </button>
          <button
            onClick={() => activeLessonId && setMobileView("lesson")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
              mobileView === "lesson"
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)]",
              !activeLessonId && "opacity-40"
            )}
          >
            <PlayCircle size={20} />
            Now Playing
          </button>
          <button
            onClick={() => setPeopleOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] transition-colors"
          >
            <Users size={20} />
            Members
          </button>
        </div>
      )}

      {studioModal && typeof document !== "undefined" && createPortal(studioModal, document.body)}
    </>
  );
}

export function DashboardCourseStudio({ roomId, communityId, onClose }: { roomId: string, communityId: string, onClose: () => void }) {
  const mockWorkspace = {
     slug: "",
     communityId,
     communityName: "Dashboard",
     ownerId: "dashboard-owner",
     memberCount: 0,
     avatarUrl: null,
     userId: "dashboard-owner",
     profile: null,
     membership: { role: "owner" as any, plan_type: "free", status: "active", space_access: [], expires_at: null },
     spacesWithRooms: [],
     points: null,
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-[var(--color-bg)] flex flex-col pt-[72px] lg:pt-0">
       <div className="h-16 lg:h-14 border-b border-[var(--color-border)] flex items-center px-4 md:px-8 justify-between bg-[var(--color-surface)] shadow-[0_4px_24px_rgba(0,0,0,0.02)] shrink-0 z-10 relative">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white shadow-sm shadow-[var(--color-accent)]/20">
                <Sparkles size={16} />
             </div>
             <div>
                <h2 className="font-black text-[var(--color-text-primary)] text-[13px] md:text-sm uppercase tracking-tight leading-none mb-0.5">Course Manager</h2>
                <p className="text-[10px] uppercase font-bold text-[var(--color-accent)] tracking-widest leading-none">Draft & Publish Mode</p>
             </div>
          </div>
          <Button onClick={onClose} variant="outline" className="rounded-xl border-[var(--color-border)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]/30 font-black text-[10px] md:text-[11px] uppercase tracking-widest gap-2 transition-all">
             <X size={14} /> Close Editor
          </Button>
       </div>
       <div className="flex-1 overflow-hidden relative">
          <WorkspaceProvider value={mockWorkspace}>
             <CourseRoom roomId={roomId} roomName="Manage Course" communityId={communityId} slug="" dashboardMode={true} />
          </WorkspaceProvider>
       </div>
    </div>
  )
}