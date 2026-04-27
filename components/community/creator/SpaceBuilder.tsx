"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Settings, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DashboardCourseStudio } from "@/components/community/rooms/CourseRoom";

export type SpaceRow = {
  id: string;
  name: string;
  icon: string | null;
  access_type: string;
  sort_order: number | null;
};

export type RoomRow = {
  id: string;
  space_id: string;
  name: string;
  slug: string;
  room_type: string;
  access_type: string;
  sort_order: number | null;
};

export function SpaceBuilder({
  communityId,
  spaces,
  rooms,
  onUpdate,
  onEditSpace,
  onDeleteSpace,
  onEditRoom,
  onDeleteRoom,
}: {
  communityId: string;
  spaces: SpaceRow[];
  rooms: RoomRow[];
  onUpdate: () => void;
  onEditSpace: (s: SpaceRow) => void;
  onDeleteSpace: (s: SpaceRow) => void;
  onEditRoom: (r: RoomRow) => void;
  onDeleteRoom: (r: RoomRow) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const bySpace = useMemo(() => {
    const m = new Map<string, RoomRow[]>();
    for (const r of rooms) {
      const list = m.get(r.space_id) ?? [];
      list.push(r);
      m.set(r.space_id, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return m;
  }, [rooms]);

  const sortedSpaces = useMemo(
    () => [...spaces].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [spaces]
  );

  async function moveSpace(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= sortedSpaces.length) return;
    const supabase = createClient();
    const a = sortedSpaces[index];
    const b = sortedSpaces[next];
    const orderA = a.sort_order ?? index;
    const orderB = b.sort_order ?? next;
    await supabase.from("spaces").update({ sort_order: orderB }).eq("id", a.id);
    await supabase.from("spaces").update({ sort_order: orderA }).eq("id", b.id);
    onUpdate();
  }

  async function moveRoom(spaceId: string, roomIndex: number, dir: -1 | 1) {
    const list = [...(bySpace.get(spaceId) ?? [])];
    const j = roomIndex + dir;
    if (j < 0 || j >= list.length) return;
    const supabase = createClient();
    const a = list[roomIndex];
    const b = list[j];
    const sa = a.sort_order ?? roomIndex;
    const sb = b.sort_order ?? j;
    await supabase.from("rooms").update({ sort_order: sb }).eq("id", a.id);
    await supabase.from("rooms").update({ sort_order: sa }).eq("id", b.id);
    onUpdate();
  }

  return (
    <div className="space-y-3">
      {sortedSpaces.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-8 text-center border border-dashed border-[var(--color-border)] rounded-sm">No spaces yet. Add one to get started.</p>
      ) : (
        sortedSpaces.map((s, i) => {
          const isOpen = open[s.id] !== false;
          const rs = bySpace.get(s.id) ?? [];
          return (
            <div key={s.id} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                <GripVertical className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" aria-hidden />
                <div className="flex flex-col gap-0.5">
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSpace(i, -1)} disabled={i === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSpace(i, 1)} disabled={i === sortedSpaces.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <button type="button" className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => setOpen((o) => ({ ...o, [s.id]: !isOpen }))}>
                  <span className="text-lg">{s.icon || "·"}</span>
                  <span className="font-black text-[var(--color-text-primary)] truncate">{s.name}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-sm bg-[var(--color-accent-light)] text-[var(--color-accent)]">{s.access_type}</span>
                </button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" onClick={(e) => { e.stopPropagation(); onEditSpace(s); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]/20" onClick={(e) => { e.stopPropagation(); onDeleteSpace(s); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {isOpen && (
                <ul className="divide-y divide-[var(--color-border)]">
                  {rs.map((r, ri) => (
                    <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <div className="flex flex-col">
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveRoom(s.id, ri, -1)} disabled={ri === 0}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveRoom(s.id, ri, 1)} disabled={ri === rs.length - 1}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-semibold text-[var(--color-text-primary)] flex-1 truncate">{r.name}</span>
                      {r.room_type === "course" && (
                        <button onClick={() => setEditingCourseId(r.id)} className="px-3 py-1 rounded-sm bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-black text-[10px] uppercase hover:bg-[var(--color-accent)] hover:text-white transition-all flex items-center gap-1.5 shrink-0 mx-2 shadow-none border border-[var(--color-accent)]/10">
                           <Settings size={12} /> Manage Course
                        </button>
                      )}
                      <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{r.room_type}</span>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] ml-2" onClick={() => onEditRoom(r)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]/20" onClick={() => onDeleteRoom(r)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
      
      {editingCourseId && (
        <DashboardCourseStudio 
           roomId={editingCourseId} 
           communityId={communityId} 
           onClose={() => setEditingCourseId(null)} 
        />
      )}
    </div>
  );
}

