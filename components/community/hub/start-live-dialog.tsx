"use client";

import { useState, useEffect, useRef } from "react";
import {
  Radio, X, Globe, Lock, Loader2, Zap, Mic, Video, VideoOff,
  Check, Shield, Calendar, Camera, Upload, DollarSign,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessSpace, type MembershipLite } from "@/lib/community-workspace-access";

type SpaceOption = { id: string; name: string; access_type: string; community_id: string };

export function StartLiveDialog({
  open,
  onClose,
  onStart,
  communitySlug,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (title: string, spaceId: string, privacy: "public" | "private") => void;
  communitySlug?: string;
}) {
  /* ── form state ── */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [spaceId, setSpaceId] = useState<string>("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  /* ── monetization toggles ── */
  const [enableTips, setEnableTips] = useState(true);
  const [enableTickets, setEnableTickets] = useState(false);
  const [ticketPrice, setTicketPrice] = useState("");
  const [showMonetization, setShowMonetization] = useState(false);

  /* ── equipment check ── */
  const [camChecked, setCamChecked] = useState(false);
  const [micChecked, setMicChecked] = useState(false);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number>(0);

  /* ── data state ── */
  const [accessibleSpaces, setAccessibleSpaces] = useState<SpaceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipLite>(null);
  const [userId, setUserId] = useState<string | null>(null);

  /* ── fetch spaces & user on open ── */
  useEffect(() => {
    if (!open) return;
    fetchSpaces();
    const getUser = async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("community_memberships")
          .select("role, plan_type, status, space_access")
          .eq("user_id", user.id)
          .eq("communities.slug", communitySlug || "")
          .single();
        if (data) setMembership(data);
      }
    };
    getUser();
    return () => { stopCamera(); stopMicLevel(); };
  }, [open, communitySlug]);

  const fetchSpaces = async () => {
    const url = communitySlug ? `/api/c/${communitySlug}/spaces` : "/api/c/spaces";
    try {
      setLoading(true);
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const allSpaces = (json.spaces ?? json.data ?? []) as SpaceOption[];
        const accessible = allSpaces.filter(sp =>
          canAccessSpace(sp.access_type, membership, undefined, userId || undefined, sp.id)
        );
        setAccessibleSpaces(accessible);
        if (accessible.length > 0 && !spaceId) setSpaceId(accessible[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch spaces:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── camera / mic handlers ── */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCamStream(stream);
      setCamChecked(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch { setCamChecked(false); }
  };

  const stopCamera = () => {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); setCamStream(null); }
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
  };

  const startMicCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      micAnalyserRef.current = analyser;
      setMicChecked(true);
      const tick = () => {
        if (!micAnalyserRef.current) return;
        const data = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
        micAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(1, avg / 128));
        micRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { setMicChecked(false); }
  };

  const stopMicLevel = () => {
    cancelAnimationFrame(micRafRef.current);
    micAnalyserRef.current = null;
    setMicLevel(0);
  };

  /* ── cover image upload ── */
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCoverPreview(URL.createObjectURL(file)); }
  };

  /* ── submit ── */
  const handleStart = async () => {
    if (!title.trim() || !spaceId) return;
    setCreating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        spaceId, title: title.trim(), privacy,
        description: description.trim() || undefined,
        maxViewers: 100,
        settings: { enableTips, enableTickets },
      };
      if (enableTickets && ticketPrice) body.ticketPrice = parseFloat(ticketPrice);
      if (schedule === "later" && scheduledDate) body.scheduledAt = new Date(scheduledDate).toISOString();

      const res = await fetch("/api/c/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      onClose();
      onStart(title.trim(), spaceId, privacy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  const selectedSpace = accessibleSpaces.find(s => s.id === spaceId);
  const ready = title.trim().length > 0 && spaceId.length > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-[500px] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <Radio className="h-4 w-4 text-[var(--color-accent)]" />
            </span>
            <h3 className="text-[14px] font-black text-[var(--color-text-primary)]">Start Live Session</h3>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ═══ Scrollable body ═══ */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin">

          {/* ── Equipment check ── */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Equipment Check</p>
            <div className="flex gap-2">
              {/* Camera preview */}
              <div className="flex-1">
                <div className={cn(
                  "relative aspect-video rounded-lg overflow-hidden bg-[var(--color-bg)] flex items-center justify-center transition",
                  camChecked && "ring-2 ring-emerald-500/30"
                )}>
                  {camChecked && camStream ? (
                    <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5 text-[var(--color-text-muted)]/40" />
                  )}
                </div>
                <button type="button" onClick={camChecked ? stopCamera : startCamera}
                  className={cn(
                    "mt-1.5 w-full rounded-lg py-1 text-[10px] font-semibold transition flex items-center justify-center gap-1",
                    camChecked
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                  )}>
                  {camChecked ? <VideoOff className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                  {camChecked ? "Camera OK" : "Test Camera"}
                </button>
              </div>
              {/* Mic meter */}
              <div className="flex-1">
                <div className={cn(
                  "relative aspect-video rounded-lg bg-[var(--color-bg)] flex items-center justify-center transition",
                  micChecked && "ring-2 ring-emerald-500/30"
                )}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-end gap-0.5 h-8">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className={cn(
                          "w-1.5 rounded-t-sm transition-all duration-75",
                          i / 12 < micLevel ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
                        )} style={{ height: `${((i + 1) / 12) * 100}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={micChecked ? stopMicLevel : startMicCheck}
                  className={cn(
                    "mt-1.5 w-full rounded-lg py-1 text-[10px] font-semibold transition flex items-center justify-center gap-1",
                    micChecked
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                  )}>
                  {micChecked ? <Check className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  {micChecked ? "Mic OK" : "Test Mic"}
                </button>
              </div>
            </div>
            {/* Equipment status */}
            {(camChecked || micChecked) && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400">
                <Check className="h-3 w-3" />
                {camChecked && micChecked ? "Camera & mic ready" : camChecked ? "Camera ready" : "Mic ready"}
              </div>
            )}
          </div>

          {/* ── Title ── */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Session Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. React Hooks Deep Dive"
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-[var(--color-accent)]/30 focus:outline-none"
            />
          </div>

          {/* ── Description ── */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Description <span className="font-normal normal-case text-[var(--color-text-muted)]/60">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What will this session cover?"
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-[var(--color-accent)]/30 focus:outline-none resize-none"
            />
          </div>

          {/* ── Space ── */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Space</label>
            {loading ? (
              <div className="mt-1.5 flex items-center gap-2 text-[var(--color-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                <span className="text-[13px]">Loading spaces...</span>
              </div>
            ) : (
              <select value={spaceId} onChange={e => setSpaceId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] transition focus:border-[var(--color-accent)]/30 focus:outline-none"
                disabled={accessibleSpaces.length === 0}>
                {accessibleSpaces.map(sp => (
                  <option key={sp.id} value={sp.id} className="bg-[var(--color-surface)]">
                    {sp.name} {sp.access_type !== "free" && `(${sp.access_type})`}
                  </option>
                ))}
                {accessibleSpaces.length === 0 && <option value="" disabled>No accessible spaces</option>}
              </select>
            )}
          </div>

          {/* ── Privacy ── */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Privacy</label>
            <div className="mt-1.5 flex gap-2">
              <button type="button" onClick={() => setPrivacy("public")}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                  privacy === "public"
                    ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                )}>
                <Globe className="h-4 w-4" /> Public
              </button>
              <button type="button" onClick={() => setPrivacy("private")}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                  privacy === "private"
                    ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                )}>
                <Lock className="h-4 w-4" /> Private
              </button>
            </div>
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              {privacy === "public"
                ? "Anyone in the community can see and join"
                : "Only members with space access can see and join"}
            </p>
          </div>

          {/* ── Schedule ── */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Schedule</label>
            <div className="mt-1.5 flex gap-2">
              <button type="button" onClick={() => setSchedule("now")}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                  schedule === "now"
                    ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                )}>
                <Zap className="h-4 w-4" /> Go Live Now
              </button>
              <button type="button" onClick={() => setSchedule("later")}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                  schedule === "later"
                    ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                )}>
                <Calendar className="h-4 w-4" /> Schedule Later
              </button>
            </div>
            {schedule === "later" && (
              <input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] transition focus:border-[var(--color-accent)]/30 focus:outline-none"
              />
            )}
          </div>

          {/* ── Cover Image ── */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Cover Image <span className="font-normal normal-case text-[var(--color-text-muted)]/60">(optional)</span></label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className={cn(
                "relative flex h-16 w-28 items-center justify-center rounded-xl overflow-hidden border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                coverPreview && "border-solid"
              )}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-5 w-5 text-[var(--color-text-muted)]/40" />
                )}
              </div>
              <label className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </label>
              {coverPreview && (
                <button type="button" onClick={() => setCoverPreview(null)}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-red-400">Remove</button>
              )}
            </div>
          </div>

          {/* ── Monetization ── */}
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <button type="button" onClick={() => setShowMonetization(v => !v)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Monetization
              </span>
              {showMonetization ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showMonetization && (
              <div className="border-t border-[var(--color-border)] px-3.5 py-3 space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--color-text-secondary)]">Enable tips</span>
                  <button type="button" onClick={() => setEnableTips(v => !v)}
                    className={cn("h-5 w-9 rounded-full transition-colors relative",
                      enableTips ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]")}>
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                      enableTips ? "left-4" : "left-0.5")} />
                  </button>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--color-text-secondary)]">Sell tickets</span>
                  <button type="button" onClick={() => setEnableTickets(v => !v)}
                    className={cn("h-5 w-9 rounded-full transition-colors relative",
                      enableTickets ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]")}>
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                      enableTickets ? "left-4" : "left-0.5")} />
                  </button>
                </label>
                {enableTickets && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--color-text-muted)]">$</span>
                    <input type="number" min="0" step="0.99" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] transition focus:border-[var(--color-accent)]/30 focus:outline-none"
                    />
                    <span className="text-[11px] text-[var(--color-text-muted)]">per ticket</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[11px] text-red-400">{error}</div>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="border-t border-[var(--color-border)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
              {camChecked && <><Check className="h-3 w-3 text-emerald-400" /> Cam</>}
              {micChecked && <><Check className="h-3 w-3 text-emerald-400" /> Mic</>}
              {selectedSpace && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {selectedSpace.name}
                </span>
              )}
            </div>
            <button type="button" onClick={handleStart} disabled={!ready || creating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-[12px] font-bold text-white transition hover:brightness-110 disabled:opacity-40">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              {creating ? "Starting…" : schedule === "later" ? "Schedule Session" : "Go Live"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}