"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Loader2, Users, Pencil, Trash2, Plus, FileText, Paperclip, X, Download, Sparkles, Video, Image as ImageIcon, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatRoomMembersAside } from "@/components/community/chat/chat-room-members-aside";
import { useWorkspace } from "@/components/community/workspace-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";

type Attachment = { url: string; name: string; type: string; size?: string; };

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
  attachments: Attachment[] | null;
  media_mode: string | null;
  slideshow: Attachment[] | null;
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
  const [editing, setEditing] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editingItem, setEditingItem] = useState<{ type: 'course' | 'module' | 'lesson', id: string, data: any } | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { membership, ownerId } = useWorkspace();

  const isStaff = membership?.role === 'owner' || membership?.role === 'admin' || ownerId === userId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${roomId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const c = data.course;
      if (c && c.course_modules) {
         c.course_modules.forEach((m: any) => {
            m.course_lessons?.forEach((l: any) => {
               if (l.attachments && typeof l.attachments === 'object' && !Array.isArray(l.attachments)) {
                   l.slideshow = l.attachments.slideshow || [];
                   l.media_mode = l.attachments.media_mode || 'video';
                   l.attachments = l.attachments.files || [];
               }
            });
         });
      }
      setCourse(c ?? null);
    } catch {
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [activeLessonId]);

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'module', title: newModuleTitle.trim() }),
      });
      if (res.ok) {
        setNewModuleTitle("");
        load();
      }
    } finally {
      setMarking(false);
    }
  };

  const addLesson = async (moduleId: string) => {
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/${roomId}/management`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lesson', moduleId, title: 'New Lesson' }),
      });
      if (res.ok) load();
    } finally {
      setMarking(false);
    }
  };

  const updateItem = async () => {
    if (!editingItem) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/${roomId}/management`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: editingItem?.type, id: editingItem?.id, ...editingItem?.data }),
      });
      if (res.ok) {
        setEditingItem(null);
        load();
      }
    } finally {
      setMarking(false);
    }
  };

  const deleteItem = async (type: 'module' | 'lesson', id: string) => {
    if (!confirm(`Delete this ${type}?`)) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/courses/${roomId}/management?type=${type}&id=${id}`, { method: 'DELETE' });
      if (res.ok) load();
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-[var(--color-text-muted)]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!editing && (!course || flatLessons.length === 0)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-muted)] flex-col gap-4">
        <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-accent)]">
          <Paperclip size={32} />
        </div>
        <div className="text-center">
          <p className="font-bold text-[var(--color-text-primary)]">No course published for this room yet.</p>
          <p className="text-xs text-[var(--color-text-muted)]">Content will appear here once it is added.</p>
        </div>
        {isStaff && (
          <Button onClick={() => setEditing(true)} className="rounded-xl border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-all font-black" variant="outline">
            Build Course Structure
          </Button>
        )}
      </div>
    );
  }

  const mainUI = (
    <>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden relative bg-[var(--color-bg)]">
        {/* Module Sidebar */}
        <div className={cn(
          "flex w-full shrink-0 flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r",
          activeLessonId ? "hidden lg:flex" : "flex h-full lg:h-auto"
        )}>
          <div className="border-b border-[var(--color-border)] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-black leading-tight text-[var(--color-text-primary)]">{course?.title || "Course Room"}</h2>
                  {isStaff && (
                    <>
                      <button onClick={() => setEditing(!editing)} className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border transition-colors", editing ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50")}>
                        {editing ? 'Stop Editing' : 'Edit'}
                      </button>
                      {editing && course && (
                         <button onClick={() => setEditingItem({ type: 'course', id: course.id, data: { title: course.title, description: course.description } })} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
                            <Pencil size={12}/>
                         </button>
                      )}
                    </>
                  )}
                </div>
                {course?.description && <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">{course.description}</p>}
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
            {[...(course?.course_modules ?? [])]
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((mod) => {
                const open = openModule[mod.id] !== false;
                const lessons = [...(mod.course_lessons ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                return (
                  <div key={mod.id} className="rounded-xl border border-[var(--color-border)] overflow-hidden group">
                    <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-surface-secondary)]">
                      <button
                        type="button"
                        className="flex-1 text-left flex items-center justify-between"
                        onClick={() => setOpenModule((o) => ({ ...o, [mod.id]: !open }))}
                      >
                        <span className="text-xs font-black text-[var(--color-text-primary)] truncate">{mod.title}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{lessons.length} lessons</span>
                      </button>
                      {editing && (
                         <div className="flex gap-1 ml-2">
                            <button onClick={() => setEditingItem({ type: 'module', id: mod.id, data: mod })} className="p-1.5 hover:bg-black/5 rounded text-[var(--color-accent)] transition-colors" title="Edit module"><Pencil size={14}/></button>
                            <button onClick={() => deleteItem('module', mod.id)} className="p-1.5 hover:bg-black/5 rounded text-[var(--color-danger)] transition-colors" title="Delete module"><Trash2 size={14}/></button>
                         </div>
                      )}
                    </div>
                    {open && (
                      <ul className="divide-y divide-[var(--color-border)]">
                        {lessons.map((les) => (
                          <li key={les.id}>
                            <div className={cn(
                                 "group/les flex items-center justify-between transition-colors",
                                 activeLessonId === les.id ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "hover:bg-[var(--color-surface-secondary)]/50"
                               )}>
                              <button
                                type="button"
                                onClick={() => setActiveLessonId(les.id)}
                                className="flex-1 text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 min-w-0"
                              >
                                {progress[les.id] ? <Check className="h-3.5 w-3.5 text-[var(--color-success)] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                                <span className="truncate">{les.title}</span>
                              </button>
                              {editing && (
                                 <div className="flex gap-1 pr-2">
                                    <button onClick={() => setEditingItem({ type: 'lesson', id: les.id, data: les })} className="p-1.5 hover:bg-black/5 rounded text-[var(--color-accent)] transition-colors" title="Edit lesson & upload resources"><Pencil size={14}/></button>
                                    <button onClick={() => deleteItem('lesson', les.id)} className="p-1.5 hover:bg-black/5 rounded text-[var(--color-danger)] transition-colors" title="Delete lesson"><Trash2 size={14}/></button>
                                 </div>
                              )}
                            </div>
                          </li>
                        ))}
                        {editing && (
                           <li>
                             <button onClick={() => addLesson(mod.id)} title={`Add lesson to ${mod.title}`} className="w-full py-3 px-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-all flex items-center justify-center gap-2 group border-t border-[var(--color-border)]/50 border-dashed">
                                <Plus size={14} className="group-hover:scale-110 transition-transform" /> New Lesson
                             </button>
                           </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            
            {editing && (
              <div className="mt-4 p-4 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] shadow-sm">
                <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest mb-2 block px-1">Curriculum Module</label>
                <div className="flex flex-col gap-3">
                  <Input 
                     placeholder="e.g. Introduction to Trading" 
                     value={newModuleTitle} 
                     onChange={e => setNewModuleTitle(e.target.value)} 
                     className="h-12 text-sm font-bold rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] shadow-none focus-visible:ring-[var(--color-accent)]/30 px-4 placeholder:font-medium placeholder:opacity-40" 
                  />
                  <Button 
                     onClick={addModule} 
                     disabled={!newModuleTitle.trim() || marking}
                     className="h-12 rounded-xl bg-[var(--color-text-primary)] hover:bg-[var(--color-accent)] text-[var(--color-bg)] font-black text-[11px] uppercase tracking-widest w-full transition-all duration-300"
                  >
                     {marking ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2 opacity-70" />}
                     Add Module
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lesson Player Panel */}
        <div className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row bg-[var(--color-bg)]",
          !activeLessonId ? "hidden lg:flex" : "flex h-full"
        )}>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {activeLesson ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6 lg:p-8">
                  <header className="flex items-center gap-3 mb-2">
                     <button onClick={() => setActiveLessonId(null)} className="lg:hidden p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors text-[var(--color-accent)]">
                        <ChevronLeft size={24} />
                     </button>
                     <h3 className="text-xl md:text-2xl font-black text-[var(--color-text-primary)] leading-tight flex-1 truncate">{activeLesson.title}</h3>
                     {editing && (
                        <button 
                          onClick={() => setEditingItem({ type: 'lesson', id: activeLesson.id, data: activeLesson })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-accent)] text-[var(--color-accent)] text-[10px] font-black uppercase hover:bg-[var(--color-accent)] hover:text-white transition-all shadow-sm shrink-0"
                        >
                           <Pencil size={12}/> Edit Content & Upload
                        </button>
                     )}
                     <button onClick={() => setPeopleOpen(true)} className="xl:hidden p-2 hover:bg-black/5 rounded-full transition-colors text-[var(--color-text-muted)]">
                        <Users size={20} />
                     </button>
                  </header>
                  
                  {activeLesson.video_url ? (
                    activeLesson.video_url.includes("youtube.com") || activeLesson.video_url.includes("youtu.be") ? (
                      <div className="aspect-video rounded-3xl overflow-hidden border border-[var(--color-border)] bg-black shadow-2xl">
                        <iframe src={youtubeEmbedUrl(activeLesson.video_url)} className="w-full h-full" title="Video" allowFullScreen />
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        key={activeLesson.video_url}
                        src={activeLesson.video_url}
                        controls
                        className="w-full rounded-3xl border border-[var(--color-border)] max-h-[600px] bg-black shadow-2xl"
                        onTimeUpdate={onVideoTime}
                      />
                    )
                  ) : activeLesson.slideshow && activeLesson.slideshow.length > 0 ? (
                      <div className="bg-[var(--color-surface-secondary)] rounded-3xl overflow-hidden aspect-video relative group border border-[var(--color-border)] shadow-2xl">
                         <div className="h-full flex items-center justify-center p-4">
                            <img src={activeLesson.slideshow[currentSlide]?.url} className="h-full w-full object-contain animate-in fade-in duration-500" alt="" />
                            <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button 
                                  variant="ghost" size="icon" 
                                  className="h-12 w-12 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
                                  onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                               >
                                  <ChevronLeft size={32}/>
                               </Button>
                               <span className="text-[11px] font-black text-white px-4 py-2 bg-black/40 rounded-full backdrop-blur-md">
                                  {currentSlide + 1} / {activeLesson.slideshow.length}
                               </span>
                               <Button 
                                  variant="ghost" size="icon" 
                                  className="h-12 w-12 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
                                  onClick={() => setCurrentSlide(prev => Math.min((activeLesson.slideshow?.length || 1) - 1, prev + 1))}
                               >
                                  <ChevronRight size={32}/>
                               </Button>
                            </div>
                         </div>
                      </div>
                  ) : (
                     <div className="h-1 lg:h-2 w-full bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-20" />
                  )}
                  
                  <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed font-medium">
                    {activeLesson.body || "This lesson contains no additional text content."}
                  </div>

                  {/* Resources Section */}
                  {activeLesson.attachments && activeLesson.attachments.length > 0 && (
                    <div className="w-full mt-8 pt-6 border-t border-[var(--color-border)]">
                       <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                          <Paperclip size={14} className="text-[var(--color-accent)]" /> Resources & Downloads
                       </h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeLesson.attachments.map((file, i) => (
                             <a key={i} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all group">
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]">
                                   <FileText size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-xs font-bold truncate text-[var(--color-text-primary)]">{file.name}</p>
                                   <p className="text-[10px] text-[var(--color-text-muted)]">{file.size || 'Attachment'}</p>
                                </div>
                                <Download size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
                             </a>
                          ))}
                       </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap gap-2 justify-between items-center">
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
                    className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black min-w-[140px]"
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
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[var(--color-bg)]">
                <div className="h-20 w-20 rounded-3xl bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-6 rotate-3">
                  <Sparkles size={40} className="animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-[var(--color-text-primary)] mb-2 uppercase tracking-tight">Your Course Canvas is Ready</h3>
                <p className="max-w-[320px] text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {editing 
                    ? "Start building your curriculum by adding your first module in the sidebar to the left." 
                    : "Select a lesson from the sidebar to begin learning."}
                </p>
                {editing && (
                  <div className="mt-8 p-3 rounded-2xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]/20 animate-bounce">
                    <p className="text-[10px] font-black uppercase text-[var(--color-accent)] flex items-center gap-2">
                       <ChevronLeft size={14} /> Add your first module over there
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <ChatRoomMembersAside
            communityId={communityId}
            userId={userId ?? ""}
            threadOpen={false}
            mobilePeopleOpen={peopleOpen}
            onMobilePeopleOpenChange={setPeopleOpen}
            desktopBreakpoint="xl"
          />
        </div>
      </div>
    </>
  );

  const studioNode = editingItem && (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-0 sm:p-4 lg:p-8 overflow-hidden pointer-events-auto">
      <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-xl" onClick={() => setEditingItem(null)} />
      
      <div className="relative w-full h-full sm:h-auto max-w-6xl bg-[var(--color-surface)] sm:rounded-[32px] shadow-[0_32px_128px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col border border-[var(--color-border)] animate-in fade-in zoom-in slide-in-from-bottom-12 duration-500 ease-out">
        {/* Studio Header: Dynamic & High-Class */}
        <div className="border-b border-[var(--color-border)] px-10 py-6 flex items-center justify-between bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-surface-secondary)]/50">
           <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center text-white shadow-[0_8px_24px_rgba(var(--color-accent-rgb),0.3)]">
                 <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                   <h3 className="font-black text-[var(--color-text-primary)] uppercase tracking-tight text-xl leading-none">Creator Studio</h3>
                   <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[9px] font-black uppercase text-[var(--color-accent)] tracking-tighter">Pro Editor</span>
                </div>
                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] mt-1.5 opacity-60">Building {editingItem?.type} Mastery</p>
              </div>
           </div>
           <button 
            onClick={() => setEditingItem(null)} 
            className="group h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-black/5 transition-all text-[var(--color-text-muted)]"
           >
              <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>
        
        {/* Studio Workspace: High-Density Creator Form */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 bg-[var(--color-bg)]/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column: Semantic Content (7 cols) */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-3">
                   <label className="text-[11px] font-black uppercase text-[var(--color-text-muted)] tracking-widest pl-1">Knowledge Title</label>
                   <Input 
                    value={editingItem?.data.title || ""} 
                    onChange={e => setEditingItem(prev => prev ? {...prev, data: {...prev.data, title: e.target.value}} : null)} 
                    placeholder="E.g., Fundamental Trading Patterns..."
                    className="h-16 rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-accent)]/10 focus:border-[var(--color-accent)]/40 text-xl font-black transition-all px-6 shadow-sm placeholder:opacity-30" 
                   />
                </div>

                {(editingItem?.type === 'module' || editingItem?.type === 'course') && (
                   <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase text-[var(--color-text-muted)] tracking-widest pl-1">Overview & Context</label>
                      <Textarea 
                        value={editingItem?.data.description || ""} 
                        onChange={e => setEditingItem(prev => prev ? {...prev, data: {...prev.data, description: e.target.value}} : null)} 
                        rows={10} 
                        placeholder="Define the learning objectives for this section..."
                         className="rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-accent)]/10 text-base font-semibold leading-relaxed p-6 resize-none shadow-sm transition-all placeholder:opacity-30" 
                      />
                   </div>
                )}

                {editingItem?.type === 'lesson' && (
                   <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase text-[var(--color-text-muted)] tracking-widest pl-1">Lesson Curriculum & Body</label>
                      <Textarea 
                        value={editingItem?.data.body || ""} 
                        onChange={e => setEditingItem(prev => prev ? {...prev, data: {...prev.data, body: e.target.value}} : null)} 
                        rows={16} 
                        placeholder="Compose your full training script, detailed notes, or step-by-step instructions here..."
                        className="rounded-3xl border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-accent)]/10 text-sm font-medium leading-relaxed p-8 resize-none shadow-sm transition-all placeholder:opacity-30" 
                      />
                   </div>
                )}
              </div>

              {/* Right Column: Experience & Assets (5 cols) */}
              <div className="lg:col-span-5 space-y-10">
                {editingItem?.type === 'lesson' && (
                   <>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between px-1">
                             <label className="text-[11px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Visual Media Strategy</label>
                             <div className="flex gap-2">
                                {['video', 'manual', 'slides'].map(mode => (
                                   <button 
                                      key={mode} 
                                      onClick={() => setEditingItem(prev => prev ? {...prev, data: {...prev.data, media_mode: mode}} : null)}
                                      className={cn(
                                         "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all",
                                         (editingItem?.data.media_mode || 'video') === mode 
                                            ? "bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/20" 
                                            : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                                      )}
                                   >
                                      {mode === 'manual' ? 'Device' : mode}
                                   </button>
                                ))}
                             </div>
                         </div>

                         {(editingItem?.data.media_mode || 'video') === 'video' && (
                            <div className="relative group animate-in fade-in duration-300">
                               <Input 
                                 value={editingItem?.data.video_url || ""} 
                                 onChange={e => setEditingItem(prev => prev ? {...prev, data: {...prev.data, video_url: e.target.value}} : null)} 
                                 placeholder="Paste direct URL (YouTube/Vimeo/MP4)"
                                 className="h-14 rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)] pr-12 font-bold shadow-sm" 
                               />
                               <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--color-accent)] opacity-40"><Video size={18}/></div>
                            </div>
                         )}

                         {editingItem?.data.media_mode === 'manual' && (
                            <Button 
                               onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'video/*';
                                  input.onchange = async (e) => {
                                     const file = (e.target as HTMLInputElement).files?.[0];
                                     if (!file) return;
                                     setMarking(true);
                                     try {
                                        const res = await uploadCommunityChatFile(communityId, roomId, file);
                                        setEditingItem(prev => prev ? {...prev, data: {...prev.data, video_url: res.url}} : null);
                                     } finally {
                                        setMarking(false);
                                     }
                                  };
                                  input.click();
                               }}
                               variant="outline" 
                               className="h-24 w-full rounded-2xl border-dashed border-2 flex flex-col gap-2 group animate-in fade-in"
                            >
                               {marking ? <Loader2 className="animate-spin text-[var(--color-accent)]" /> : (
                                  <>
                                     <PlayCircle className="text-[var(--color-accent)] group-hover:scale-110 transition-transform" />
                                     <span className="text-[9px] font-black uppercase text-[var(--color-text-primary)]">Upload MP4 from Device</span>
                                  </>
                               )}
                            </Button>
                         )}

                         {editingItem?.data.media_mode === 'slides' && (
                             <div className="space-y-3 animate-in fade-in duration-300">
                                <div className="grid grid-cols-4 gap-2">
                                   {(editingItem?.data.slideshow || []).map((img: Attachment, i: number) => (
                                      <div key={i} className="aspect-square rounded-lg border bg-black/5 relative group overflow-hidden">
                                         <img src={img.url} className="w-full h-full object-cover" alt="slide" />
                                         <button 
                                          onClick={() => setEditingItem(prev => prev ? {...prev, data: {...prev.data, slideshow: (prev.data.slideshow as Attachment[]).filter((_, idx) => idx !== i)}} : null)}
                                          className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                                         >
                                            <X size={10} />
                                         </button>
                                      </div>
                                   ))}
                                   <button 
                                    onClick={() => {
                                       const input = document.createElement('input');
                                       input.type = 'file';
                                       input.accept = 'image/*';
                                       input.multiple = true;
                                       input.onchange = async (e) => {
                                          const files = (e.target as HTMLInputElement).files;
                                          if (!files) return;
                                          setMarking(true);
                                          try {
                                             const urls = [...(editingItem?.data.slideshow || [])];
                                             for (const f of Array.from(files)) {
                                                const res = await uploadCommunityChatFile(communityId, roomId, f);
                                                urls.push({ url: res.url, name: f.name, type: f.type });
                                             }
                                             setEditingItem(prev => prev ? {...prev, data: {...prev.data, slideshow: urls}} : null);
                                          } finally {
                                             setMarking(false);
                                          }
                                       };
                                       input.click();
                                    }}
                                    disabled={marking}
                                    className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center hover:bg-[var(--color-accent)]/5 hover:text-[var(--color-accent)]"
                                   >
                                      {marking ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                   </button>
                                </div>
                                <p className="text-[10px] italic text-[var(--color-text-muted)] text-center">Images will become a high-quality video slideshow.</p>
                             </div>
                         )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                           <label className="text-[11px] font-black uppercase text-[var(--color-text-muted)] tracking-widest font-sans">Supplementary Assets</label>
                           <span className="text-[10px] font-black text-[var(--color-accent)] bg-[var(--color-accent)]/5 px-2 py-0.5 rounded-full">{(editingItem?.data.attachments || []).length} Loaded</span>
                        </div>
                        <div className="space-y-3 p-1">
                           {(editingItem?.data.attachments || []).map((file: Attachment, idx: number) => (
                              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm group hover:border-[var(--color-accent)]/30 transition-all">
                                 <div className="h-10 w-10 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-blue-500">
                                    <FileText size={20} />
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black truncate text-[var(--color-text-primary)]">{file.name}</p>
                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">{file.size || 'Attachment'}</p>
                                 </div>
                                 <button 
                                  onClick={() => setEditingItem(prev => prev ? { ...prev, data: { ...prev.data, attachments: (prev.data.attachments as Attachment[]).filter((_, i) => i !== idx) } } : null)} 
                                  className="h-8 w-8 flex items-center justify-center hover:bg-red-500/10 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                                 >
                                    <X size={16} />
                                 </button>
                              </div>
                           ))}
                           <Button 
                            variant="outline" 
                            className="w-full border-dashed border-2 rounded-3xl h-36 flex flex-col gap-4 border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-all duration-300 group shadow-sm bg-[var(--color-surface)]/20" 
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.onchange = async (e) => {
                                 const files = (e.target as HTMLInputElement).files;
                                 if (!files) return;
                                 setMarking(true);
                                 try {
                                    const newAtts = [...(editingItem?.data.attachments || [])];
                                    for (const file of Array.from(files)) {
                                       const res = await uploadCommunityChatFile(communityId, roomId, file);
                                       newAtts.push({ url: res.url, name: file.name, type: file.type, size: (file.size / 1024).toFixed(1) + ' KB' });
                                    }
                                    setEditingItem(prev => prev ? { ...prev, data: { ...prev.data, attachments: newAtts } } : null);
                                 } finally {
                                    setMarking(false);
                                 }
                              };
                              input.click();
                           }} disabled={marking}>
                              {marking ? <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" /> : (
                                <>
                                  <div className="h-12 w-12 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)] group-hover:scale-110 group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all duration-500">
                                    <Paperclip size={24} />
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[11px] font-black uppercase text-[var(--color-text-primary)] tracking-widest">Secure File Upload</p>
                                     <p className="text-[9px] font-bold text-[var(--color-text-muted)] mt-1 tracking-tighter">Support for PDF, Guidebooks, and Media Bundles</p>
                                  </div>
                                </>
                              )}
                           </Button>
                        </div>
                      </div>
                   </>
                )}
              </div>
            </div>
        </div>

        {/* Studio Footer: Final Actions */}
        <div className="p-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-end items-center gap-4 bg-[var(--color-surface)]/80 backdrop-blur-md">
           <Button 
            variant="ghost" 
            className="w-full sm:w-auto h-14 rounded-2xl px-12 text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest hover:bg-black/5" 
            onClick={() => setEditingItem(null)}
           >
            Cancel Workspace
           </Button>
           <Button 
            className="w-full sm:w-auto h-14 rounded-2xl px-20 bg-[var(--color-accent)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--color-accent)]/30 hover:scale-[1.03] active:scale-95 hover:shadow-[var(--color-accent)]/50 transition-all duration-500" 
            onClick={updateItem} 
            disabled={marking}
           >
              {marking ? <Loader2 size={18} className="animate-spin mr-3" /> : null}
              Release Course Content
           </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mainUI}
      {studioNode && typeof document !== 'undefined' && createPortal(studioNode, document.body)}
    </>
  );
}