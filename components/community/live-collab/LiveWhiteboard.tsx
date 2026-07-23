"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Eraser,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createStroke,
  useLiveCollabStore,
  type WhiteboardTool,
} from "@/lib/community/live-collab";

const TOOLS: { id: WhiteboardTool; label: string; icon: typeof Pencil }[] = [
  { id: "draw", label: "Draw", icon: Pencil },
  { id: "sticky", label: "Sticky", icon: StickyNote },
  { id: "shape", label: "Shape", icon: Square },
  { id: "text", label: "Text", icon: Type },
  { id: "pointer", label: "Pointer", icon: MousePointer2 },
];

/**
 * Collaborative whiteboard — strokes persisted in live-collab store.
 * Lazy-load from Live Studio; no media-plane coupling.
 */
export function LiveWhiteboard({
  sessionId,
  userId,
  userName,
  canEdit = true,
}: {
  sessionId: string;
  userId?: string | null;
  userName?: string | null;
  canEdit?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const points = useRef<{ x: number; y: number }[]>([]);
  const tool = useLiveCollabStore((s) => s.whiteboardTool);
  const setTool = useLiveCollabStore((s) => s.setWhiteboardTool);
  const strokes = useLiveCollabStore((s) => s.strokesBySession[sessionId] ?? []);
  const addStroke = useLiveCollabStore((s) => s.addStroke);
  const clearWhiteboard = useLiveCollabStore((s) => s.clearWhiteboard);
  const [color, setColor] = useState("#fd5000");

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);
    for (const s of strokes) {
      if (s.tool === "sticky" || s.tool === "text") {
        const p = s.points[0];
        if (!p) continue;
        ctx.fillStyle = s.tool === "sticky" ? "#fef3c7" : "transparent";
        if (s.tool === "sticky") ctx.fillRect(p.x, p.y, 120, 80);
        ctx.fillStyle = s.color;
        ctx.font = "12px system-ui";
        ctx.fillText(s.text || "Note", p.x + 8, p.y + 20);
        continue;
      }
      if (s.tool === "shape" && s.points.length >= 2) {
        const a = s.points[0];
        const b = s.points[s.points.length - 1];
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        continue;
      }
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.tool === "pointer" ? 3 : 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e: React.PointerEvent) {
    if (!canEdit) return;
    drawing.current = true;
    points.current = [pos(e)];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current || !canEdit) return;
    points.current.push(pos(e));
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || points.current.length < 2) return;
    const a = points.current[points.current.length - 2];
    const b = points.current[points.current.length - 1];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function onUp() {
    if (!drawing.current || !canEdit) return;
    drawing.current = false;
    const pts = points.current;
    if (pts.length === 0) return;
    let text: string | undefined;
    if (tool === "sticky" || tool === "text") {
      text = window.prompt(tool === "sticky" ? "Sticky note" : "Text") || undefined;
      if (!text) return;
    }
    addStroke(
      sessionId,
      createStroke({
        tool,
        color,
        points: pts,
        text,
        authorId: userId ?? null,
        authorName: userName ?? null,
      })
    );
    points.current = [];
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `whiteboard-${sessionId}.png`;
    a.click();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-100 px-2 py-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            disabled={!canEdit}
            onClick={() => setTool(t.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold",
              tool === t.id
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="ml-1 h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
          aria-label="Stroke color"
        />
        <button
          type="button"
          aria-label="Clear board"
          disabled={!canEdit}
          onClick={() => clearWhiteboard(sessionId)}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100"
        >
          <Eraser className="h-3.5 w-3.5" />
          Clear
        </button>
        <button
          type="button"
          aria-label="Export PNG"
          onClick={exportPng}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="min-h-[220px] flex-1 w-full touch-none cursor-crosshair bg-neutral-50"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
