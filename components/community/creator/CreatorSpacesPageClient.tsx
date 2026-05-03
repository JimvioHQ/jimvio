"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpaceBuilder, type RoomRow, type SpaceRow } from "@/components/community/creator/SpaceBuilder";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const EMOJI_GRID = ["💬", "📚", "📣", "📅", "✅", "🎯", "💡", "🚀", "🌟", "🔥", "💼", "🧠"];

const ROOM_TYPES: { id: string; label: string; desc: string; emoji: string }[] = [
  { id: "chat", label: "Chat Room", desc: "Real-time messaging", emoji: "💬" },
  { id: "course", label: "Course Room", desc: "Structured lessons", emoji: "📚" },
  { id: "posts", label: "Posts Room", desc: "Discussions and announcements", emoji: "📣" },
  { id: "resources", label: "Resources Room", desc: "Files and links", emoji: "📅" },
  { id: "tasks", label: "Tasks Room", desc: "Challenges and daily tasks", emoji: "✅" },
];

/** Supabase PostgrestError and Error both carry .message; avoid throwing raw objects (shows as [object Object]). */
function supabaseErrorMessage(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export function CreatorSpacesPageClient({ communityId }: { communityId: string }) {
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [communitySlug, setCommunitySlug] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: sp } = await supabase
      .from("spaces")
      .select("id, name, icon, access_type, sort_order")
      .eq("community_id", communityId)
      .order("sort_order");
    const { data: rm } = await supabase
      .from("rooms")
      .select("id, space_id, name, slug, room_type, access_type, sort_order")
      .eq("community_id", communityId)
      .order("sort_order");
    const { data: comm } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", communityId)
      .single();
    if (comm) setCommunitySlug(comm.slug);

    setSpaces((sp as SpaceRow[]) ?? []);
    setRooms((rm as RoomRow[]) ?? []);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const [spaceModal, setSpaceModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [roomSpaceId, setRoomSpaceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const [sName, setSName] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sIcon, setSIcon] = useState("💬");
  const [sColor, setSColor] = useState("#7c3aed");
  const [sAccess, setSAccess] = useState<"free" | "paid" | "premium">("free");

  const [rName, setRName] = useState("");
  const [rType, setRType] = useState("chat");
  const [rAccess, setRAccess] = useState<"inherit" | "free" | "paid" | "premium">("inherit");

  async function saveSpace() {
    if (!sName.trim()) return;
    setSaving(true);
    setSpaceError(null);
    try {
      const supabase = createClient();
      const base = slugify(sName.trim()) || "space";
      const data = {
        name: sName.trim(),
        description: sDesc.trim() || null,
        icon: sIcon,
        color: sColor,
        access_type: sAccess,
      };

      let error;
      if (editingSpaceId) {
        const { error: err } = await supabase.from("spaces").update(data).eq("id", editingSpaceId);
        error = err;
      } else {
        const { error: err } = await supabase.from("spaces").insert({
          ...data,
          community_id: communityId,
          slug: `${base}-${Date.now().toString(36)}`.slice(0, 80),
          sort_order: spaces.length,
        });
        error = err;
      }
      if (error) {
        setSpaceError(supabaseErrorMessage(error));
        return;
      }
      setSpaceModal(false);
      setSName("");
      setSDesc("");
      await load();
    } catch (e) {
      setSpaceError(supabaseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveRoom() {
    if (!rName.trim() || !roomSpaceId) return;
    setSaving(true);
    setRoomError(null);
    try {
      const supabase = createClient();
      const base = slugify(rName.trim()) || "room";
      const data = {
        name: rName.trim(),
        room_type: rType,
        access_type: rAccess,
      };

      let error;
      if (editingRoomId) {
        const { error: err } = await supabase.from("rooms").update(data).eq("id", editingRoomId);
        error = err;
      } else {
        const { error: err } = await supabase.from("rooms").insert({
          ...data,
          community_id: communityId,
          space_id: roomSpaceId,
          slug: `${base}-${Date.now().toString(36)}`.slice(0, 80),
          sort_order: rooms.filter((x) => x.space_id === roomSpaceId).length,
        });
        error = err;
      }
      if (error) {
        setRoomError(supabaseErrorMessage(error));
        return;
      }
      setRoomModal(false);
      setRName("");
      setRoomSpaceId(null);
      await load();
    } catch (e) {
      setRoomError(supabaseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Manage Spaces</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Organize spaces and rooms for your community.</p>
        </div>
        <Button
          type="button"
          className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
          onClick={() => {
            setSpaceError(null);
            setEditingSpaceId(null);
            setSName("");
            setSDesc("");
            setSpaceModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Space
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20 text-[var(--color-text-muted)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <SpaceBuilder
            communityId={communityId}
            spaces={spaces}
            rooms={rooms}
            onUpdate={load}
            onEditSpace={(s) => {
              setEditingSpaceId(s.id);
              setSName(s.name);
              setSDesc((s as any).description || "");
              setSIcon(s.icon || "💬");
              setSColor((s as any).color || "#7c3aed");
              setSAccess(s.access_type as any);
              setSpaceModal(true);
            }}
            onDeleteSpace={async (s) => {
              if (!confirm(`Are you sure you want to delete the space "${s.name}"?`)) return;
              const supabase = createClient();
              await supabase.from("spaces").delete().eq("id", s.id);
              await load();
            }}
            onEditRoom={(r) => {
              setEditingRoomId(r.id);
              setRoomSpaceId(r.space_id);
              setRName(r.name);
              setRType(r.room_type);
              setRAccess(r.access_type as any);
              setRoomModal(true);
            }}
            onDeleteRoom={async (r) => {
              if (!confirm(`Are you sure you want to delete the room "${r.name}"?`)) return;
              const supabase = createClient();
              await supabase.from("rooms").delete().eq("id", r.id);
              await load();
            }}
          />
          <div className="flex flex-col gap-4 mt-6">
            <h3 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-widest pl-1">Quick Add By Space</h3>
            {spaces.map((s) => (
              <div key={s.id} className="w-full flex flex-col p-4 border border-[var(--color-border)] rounded-sm bg-[var(--color-surface-secondary)]/20 shadow-none">
                  <h4 className="text-sm font-black text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                     <span className="text-xl">{s.icon}</span> {s.name}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="rounded-sm border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] text-[10px] uppercase font-black tracking-wider transition-all h-9" onClick={() => { setEditingRoomId(null); setRName(""); setRoomError(null); setRType("course"); setRoomSpaceId(s.id); setRoomModal(true); }}>
                        + Add Course
                      </Button>
                      <Button type="button" variant="outline" className="rounded-sm border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] text-[10px] uppercase font-black tracking-wider transition-all h-9" onClick={() => { setEditingRoomId(null); setRName(""); setRoomError(null); setRType("tasks"); setRoomSpaceId(s.id); setRoomModal(true); }}>
                        + Add Task Room
                      </Button>
                      <Button type="button" variant="outline" className="rounded-sm border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] text-[10px] uppercase font-black tracking-wider transition-all h-9" onClick={() => { setEditingRoomId(null); setRName(""); setRoomError(null); setRType("resources"); setRoomSpaceId(s.id); setRoomModal(true); }}>
                        + Add Resources
                      </Button>
                      <Button type="button" variant="outline" className="rounded-sm border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] text-[10px] uppercase font-black tracking-wider transition-all h-9" onClick={() => { setEditingRoomId(null); setRName(""); setRoomError(null); setRType("chat"); setRoomSpaceId(s.id); setRoomModal(true); }}>
                        + Add Chat Room
                      </Button>
                      <Button type="button" variant="outline" className="rounded-sm border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] text-[10px] uppercase font-black tracking-wider transition-all h-9" onClick={() => { setEditingRoomId(null); setRName(""); setRoomError(null); setRType("posts"); setRoomSpaceId(s.id); setRoomModal(true); }}>
                        + Add Forum / Posts
                      </Button>
                  </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={spaceModal}
        onOpenChange={(open) => {
          setSpaceModal(open);
          if (!open) setSpaceError(null);
        }}
      >
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black !text-[var(--color-text-primary)]">New space</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={sName} onChange={(e) => setSName(e.target.value)} className="rounded-sm border-[var(--color-border)]" />
            <Textarea placeholder="Description" value={sDesc} onChange={(e) => setSDesc(e.target.value)} rows={3} className="rounded-sm border-[var(--color-border)]" />
            <p className="text-xs font-bold text-[var(--color-text-muted)]">Icon</p>
            <div className="flex flex-wrap gap-2">
              {EMOJI_GRID.map((e) => (
                <button key={e} type="button" className={`text-2xl p-1 rounded-sm ${sIcon === e ? "ring-2 ring-[var(--color-accent)]" : ""}`} onClick={() => setSIcon(e)}>
                  {e}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)]">Accent color</label>
              <Input type="color" value={sColor} onChange={(e) => setSColor(e.target.value)} className="h-10 mt-1 rounded-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)]">Access</label>
              <select
                value={sAccess}
                onChange={(e) => setSAccess(e.target.value as typeof sAccess)}
                className="mt-1 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
          {spaceError ? (
            <p className="text-sm text-[var(--color-danger)] font-semibold rounded-sm bg-[var(--color-danger-light)]/40 px-3 py-2 border border-[var(--color-danger)]/20">
              {spaceError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-sm" onClick={() => setSpaceModal(false)}>
              Cancel
            </Button>
            <Button className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" disabled={saving} onClick={saveSpace}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={roomModal}
        onOpenChange={(open) => {
          setRoomModal(open);
          if (!open) setRoomError(null);
        }}
      >
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black !text-[var(--color-text-primary)]">New room</DialogTitle>
          </DialogHeader>
          <Input placeholder="Room name" value={rName} onChange={(e) => setRName(e.target.value)} className="rounded-sm border-[var(--color-border)]" />
          <p className="text-xs font-bold text-[var(--color-text-muted)]">Room type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROOM_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRType(t.id)}
                className={`text-left rounded-sm border p-3 transition-colors ${rType === t.id ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"}`}
              >
                <div className="text-xs font-black">
                  {t.emoji} {t.label}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)]">{t.desc}</div>
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Access</label>
            <select
              value={rAccess}
              onChange={(e) => setRAccess(e.target.value as typeof rAccess)}
              className="mt-1 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold"
            >
              <option value="inherit">Inherit from space</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          {roomError ? (
            <p className="text-sm text-[var(--color-danger)] font-semibold rounded-sm bg-[var(--color-danger-light)]/40 px-3 py-2 border border-[var(--color-danger)]/20">
              {roomError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-sm" onClick={() => setRoomModal(false)}>
              Cancel
            </Button>
            <Button className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" disabled={saving} onClick={saveRoom}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create room"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

