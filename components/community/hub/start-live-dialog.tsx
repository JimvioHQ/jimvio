"use client";

import { useState, useEffect } from "react";
import { Radio, X, Globe, Lock, Loader2, Zap, Mic, Video, Users, ChevronRight, Check, Shield } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [spaceId, setSpaceId] = useState<string>("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [accessibleSpaces, setAccessibleSpaces] = useState<SpaceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<"details" | "preview">("details");
  const [membership, setMembership] = useState<MembershipLite>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchSpaces();
    setActiveStep("details");
    // Get current user ID and membership
    const getUser = async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch membership for access control
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
  }, [open, communitySlug]);

  const fetchSpaces = async () => {
    if (!communitySlug) {
      // Global mode: fetch spaces from all user's communities
      try {
        setLoading(true);
        const res = await fetch("/api/c/spaces");
        if (res.ok) {
          const { spaces } = await res.json();
          const allSpaces = spaces || [];
          setSpaces(allSpaces);
          const accessible = allSpaces.filter(sp => 
            canAccessSpace(sp.access_type, membership, undefined, userId || undefined, sp.id)
          );
          setAccessibleSpaces(accessible);
          if (accessible.length > 0 && !spaceId) {
            setSpaceId(accessible[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch spaces:", err);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`/api/c/${communitySlug}/spaces`);
      if (res.ok) {
        const { data } = await res.json();
        const allSpaces = data || [];
        setSpaces(allSpaces);
        const accessible = allSpaces.filter(sp => 
          canAccessSpace(sp.access_type, membership, undefined, userId || undefined, sp.id)
        );
        setAccessibleSpaces(accessible);
        if (accessible.length > 0 && !spaceId) {
          setSpaceId(accessible[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch spaces:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!title.trim() || !spaceId) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/c/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId,
          title: title.trim(),
          privacy,
          maxViewers: 100,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      onClose();
      onStart(title.trim(), spaceId, privacy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  const selectedSpace = accessibleSpaces.find((s) => s.id === spaceId);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-[440px] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fd5000]/10">
              <Radio className="h-4 w-4 text-[#fd5000]" />
            </span>
            <h3 className="text-[14px] font-black text-white">Start Live Session</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold", activeStep === "details" ? "bg-[#fd5000] text-white" : "bg-white/5 text-zinc-500")}>
                1
              </div>
              <span className={cn("text-[11px] font-semibold", activeStep === "details" ? "text-white" : "text-zinc-500")}>Details</span>
            </div>
            <div className="flex h-1 w-12 items-center">
              <div className="flex-1 h-0.5 rounded" style={{ background: activeStep === "preview" ? "var(--color-accent)" : "var(--color-border)" }} />
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold", activeStep === "preview" ? "bg-[#fd5000] text-white" : "bg-white/5 text-zinc-500")}>
                2
              </div>
              <span className={cn("text-[11px] font-semibold", activeStep === "preview" ? "text-white" : "text-zinc-500")}>Preview</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeStep === "details" ? (
            <div className="space-y-5 animate-in animate-fade-in-up">
              {/* Title */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Session Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. React Hooks Deep Dive"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder-zinc-600 transition focus:border-[#fd5000]/30 focus:bg-white/[0.07] focus:outline-none"
                />
              </div>

              {/* Space */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Space</label>
                {loading ? (
                  <div className="mt-1.5 flex items-center gap-2 text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[#fd5000]" />
                    <span className="text-[13px]">Loading spaces...</span>
                  </div>
                ) : (
                  <select
                    value={spaceId}
                    onChange={(e) => setSpaceId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white transition focus:border-[#fd5000]/30 focus:bg-white/[0.07] focus:outline-none"
                    disabled={accessibleSpaces.length === 0}
                  >
                    {accessibleSpaces.map((sp) => (
                      <option key={sp.id} value={sp.id} className="bg-[#1a1a1a]">
                        {sp.name} {sp.access_type !== "free" && `(${sp.access_type})`}
                      </option>
                    ))}
                    {accessibleSpaces.length === 0 && <option value="" disabled>No accessible spaces</option>}
                  </select>
                )}
              </div>

              {/* Privacy */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Privacy</label>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrivacy("public")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                      privacy === "public"
                        ? "border-[#fd5000]/30 bg-[#fd5000]/10 text-[#fd5000]"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    <Globe className="h-4 w-4" />
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivacy("private")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                      privacy === "private"
                        ? "border-[#fd5000]/30 bg-[#fd5000]/10 text-[#fd5000]"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    <Lock className="h-4 w-4" />
                    Private
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-zinc-600">
                  {privacy === "public"
                    ? "Anyone in the community can see and join this session"
                    : "Only members with space access can see and join"}
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[11px] text-red-400">
                  {error}
                </div>
              )}

              {/* Next button */}
              <button
                type="button"
                onClick={() => setActiveStep("preview")}
                disabled={!title.trim() || !spaceId || creating}
                className="w-full rounded-xl bg-[#fd5000] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[#e04800] disabled:opacity-40"
              >
                Next: Preview
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in animate-fade-in-up">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Session Preview</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-white">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fd5000]/10 text-[#fd5000]">
                      <Radio className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold">{title || "Untitled Session"}</p>
                      <p className="text-[11px] text-zinc-500">{selectedSpace?.name || "Select a space"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                      {privacy === "public" ? <Globe className="h-4 w-4 text-zinc-400" /> : <Lock className="h-4 w-4 text-zinc-400" />}
                    </span>
                    <span className="text-zinc-300">{privacy === "public" ? "Public" : "Private"}</span>
                    <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">{privacy === "public" ? "Anyone can join" : "Members only"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                      <Users className="h-4 w-4 text-zinc-400" />
                    </span>
                    <span className="text-zinc-300">Max viewers: 100</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveStep("details")}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-zinc-300 transition hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-[#fd5000] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[#e04800] disabled:opacity-40"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Go Live"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}