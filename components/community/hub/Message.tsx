"use client";

import { useState } from "react";
import {
  Search, Plus, Bell, Sun, Edit3, SlidersHorizontal, Phone, Video, Sparkles,
  MoreHorizontal, X, Pin, Play, Paperclip, Mic, Send,
  Download, ChevronRight, Users, ShoppingCart, DollarSign,
} from "lucide-react";
import { FaFilePdf, FaFileExcel, FaFileVideo } from "react-icons/fa";
import { EmojiPickerButton } from "./EmojiPickerButton";

const Avatar = ({ i, size = 32, ring }: { i: number; size?: number; ring?: string }) => (
  <img src={`https://i.pravatar.cc/80?img=${i}`} alt="" width={size} height={size}
    className={`rounded-full object-cover ${ring ?? ""}`} style={{ width: size, height: size }} />
);

const FILE_ICONS = {
  pdf: FaFilePdf,
  xlsx: FaFileExcel,
  mp4: FaFileVideo,
} as const;

export default function MessagesView() {
  const [draft, setDraft] = useState("");

  const appendEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[oklch(0.975_0.008_260)]">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Thread list */}
        <div className="w-[240px] shrink-0 border-r border-border bg-card flex flex-col">
          <div className="p-3 flex items-center justify-between">
            <h2 className="font-bold text-sm">Messages</h2>
            <div className="flex items-center gap-1">
              <button className="p-1"><Edit3 className="h-3.5 w-3.5" /></button>
              <button className="p-1"><SlidersHorizontal className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="px-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search messages" className="w-full bg-muted rounded-full pl-8 pr-3 py-1.5 text-[11px] outline-none" />
            </div>
          </div>
          <div className="px-3 mt-2 flex items-center gap-2 text-[10px]">
            <span className="bg-accent text-brand font-semibold px-2 py-0.5 rounded">All 12</span>
            <span className="text-muted-foreground">Unread 4</span>
            <span className="text-muted-foreground">Groups 3</span>
            <span className="text-muted-foreground">Spaces 2</span>
          </div>
          <div className="mt-2 flex-1 overflow-y-auto">
            {[
              { n: "Maya Editz", p: "Typing...", t: "2m", i: 5, b: 3, active: true },
              { n: "Barick fx", p: "Thanks brother 🔥", t: "10m", i: 6 },
              { n: "Daniel M.", p: "Check this out", t: "1h", i: 8, b: 2 },
              { n: "K. Sensei", p: "Great analysis!", t: "2h", i: 7 },
              { n: "Trade Team", p: "Entry: See you at 8PM", t: "3h", i: 9, b: 5 },
              { n: "Support Team", p: "We have updated the...", t: "1d", i: 10 },
              { n: "VIP Traders", p: "New signal posted", t: "2d", i: 11 },
              { n: "AI Mastery", p: "Course update: New module", t: "3d", i: 12 },
              { n: "Jay Labs", p: "Collab idea 💡", t: "3d", i: 13 },
            ].map((c) => (
              <button key={c.n} className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted ${c.active ? "bg-accent" : ""}`}>
                <Avatar i={c.i} size={32} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[11px] font-semibold truncate">{c.n}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{c.p}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-muted-foreground">{c.t}</div>
                  {c.b && <div className="mt-0.5 bg-brand text-brand-foreground text-[8px] font-bold rounded-full h-4 w-4 grid place-items-center ml-auto">{c.b}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          {/* Chat header */}
          <div className="h-14 border-b border-border px-3 flex items-center gap-2 shrink-0">
            <Avatar i={5} size={36} />
            <div className="flex-1">
              <div className="text-xs font-semibold flex items-center gap-1">Maya Editz <span className="text-[9px] font-bold text-brand bg-accent px-1.5 rounded">Creator</span></div>
              <div className="text-[10px] text-emerald-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online</div>
            </div>
            <button className="p-1.5"><Phone className="h-4 w-4" /></button>
            <button className="p-1.5"><Video className="h-4 w-4" /></button>
            <button className="p-1.5"><Sparkles className="h-4 w-4" /></button>
            <button className="p-1.5"><MoreHorizontal className="h-4 w-4" /></button>
            <button className="rounded-lg bg-brand text-brand-foreground text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1"><Mic className="h-3 w-3" />Start Voice Room</button>
          </div>

          {/* Pinned */}
          <div className="mx-3 mt-2 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shrink-0">
            <Pin className="h-3 w-3 text-brand" />
            <span className="text-[10px] flex-1"><b>Pinned:</b> Don&apos;t forget! Live Trading Masterclass tonight at 8PM.</span>
            <button className="text-[10px] text-brand font-semibold">View</button>
            <X className="h-3 w-3" />
            <div className="flex -space-x-1.5"><Avatar i={6} size={16} /><Avatar i={7} size={16} /><Avatar i={8} size={16} /></div>
            <span className="text-[10px]">+3</span>
            <Search className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            <div className="text-center text-[10px] text-muted-foreground">Today</div>

            <MsgIn i={5}>Hey John! 👋<br />How&apos;s your trading going today?<span className="block text-[9px] text-muted-foreground mt-1">10:30 AM</span></MsgIn>
            <MsgOut>Hey Maya! 👋<br />Doing good! Just analyzed EURUSD and found a nice entry setup. Check this out 👇<span className="block text-[9px] mt-1 opacity-70">10:32 AM</span></MsgOut>
            <MsgOut>
              <div className="flex items-center gap-2 bg-white/20 rounded p-2">
                <div className="h-7 w-7 rounded bg-rose-500/10 text-rose-600 grid place-items-center">
                  <FaFilePdf className="h-4 w-4" />
                </div>
                <div className="flex-1"><div className="text-[10px] font-semibold">EURUSD_Analysis.pdf</div><div className="text-[9px] opacity-80">2.4 MB</div></div>
                <Download className="h-3.5 w-3.5" />
              </div>
              <div className="text-[9px] mt-1 opacity-70">10:32 AM ✓✓</div>
            </MsgOut>

            <MsgIn i={5}>
              <div className="flex items-center gap-2">
                <button className="h-7 w-7 rounded-full bg-brand grid place-items-center text-white"><Play className="h-3 w-3" /></button>
                <svg viewBox="0 0 80 20" className="w-24 h-5"><path d="M0,10 L4,5 L8,15 L12,3 L16,17 L20,7 L24,12 L28,4 L32,16 L36,8 L40,11 L44,6 L48,14 L52,9 L56,13 L60,5 L64,15 L68,10 L72,7 L76,12 L80,10" stroke="oklch(0.68 0.19 42)" strokeWidth="1.5" fill="none" /></svg>
                <span className="text-[9px]">0:23</span>
                <span className="text-[9px] text-muted-foreground">10:33 AM</span>
              </div>
              <div className="text-xs mt-1">🔥</div>
            </MsgIn>

            <MsgIn i={5}>Nice analysis 🔥<br />The market structure is on point.<br />What&apos;s your target?<span className="block text-[9px] text-muted-foreground mt-1">10:34 AM</span></MsgIn>
            <MsgOut>First target 1.0880, second 1.0920<br />Let&apos;s see how price reacts 🚀<span className="block text-[9px] mt-1 opacity-70">10:35 AM ✓✓</span></MsgOut>
            <div className="flex justify-end gap-1">
              {["❤️", "🔥", "👍", "😄"].map((emoji) => (
                <button key={emoji} type="button" className="bg-white border rounded-full px-1.5 text-[10px] hover:bg-muted transition-colors">{emoji}</button>
              ))}
              <EmojiPickerButton
                onEmojiSelect={appendEmoji}
                label="+"
                className="bg-white border rounded-full px-1.5 text-[10px] hover:bg-muted transition-colors"
              />
            </div>

            <MsgIn i={5}>Perfect! I&apos;ll be watching it closely.<br />Let&apos;s catch this move 🚀<div className="text-xs">❤️ 1</div><span className="block text-[9px] text-muted-foreground mt-1">10:36 AM</span></MsgIn>
            <MsgOut>Let&apos;s go! 🔥<span className="block text-[9px] mt-1 opacity-70">10:37 AM ✓✓</span></MsgOut>
          </div>

          {/* Composer */}
          <div className="border-t border-border p-2 shrink-0">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
              <EmojiPickerButton onEmojiSelect={appendEmoji} />
              <Plus className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 bg-transparent text-[11px] outline-none"
              />
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-bold">GIF</span>
              <EmojiPickerButton onEmojiSelect={appendEmoji} />
              <Mic className="h-4 w-4 text-muted-foreground" />
              <button type="button" className="h-7 w-7 rounded-full bg-brand grid place-items-center text-white"><Send className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px]">
              <button className="bg-brand text-brand-foreground rounded-full px-2.5 py-1 flex items-center gap-1 font-semibold"><Sparkles className="h-3 w-3" />AI Assistant</button>
              {["Send Course", "Share Clip", "Invite to Space", "Share Signal"].map(l => (
                <button key={l} className="border border-border rounded-full px-2.5 py-1">{l}</button>
              ))}
              <button className="border border-border rounded-full px-2.5 py-1 flex items-center gap-1">More <ChevronRight className="h-2.5 w-2.5" /></button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="w-[240px] shrink-0 border-l border-border bg-card overflow-y-auto p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs">About this chat</h3>
            <X className="h-3.5 w-3.5" />
          </div>
          <div className="mt-3 flex flex-col items-center text-center">
            <Avatar i={5} size={70} />
            <div className="mt-2 text-sm font-semibold flex items-center gap-1">Maya Editz <span className="text-[9px] font-bold text-brand bg-accent px-1.5 rounded">Creator</span></div>
            <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online</div>
            <p className="text-[10px] text-muted-foreground mt-2">Video Editor & Content Creator<br />Helping creators tell stories that convert.</p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 text-center">
            {[
              { l: "Level", v: "24" },
              { l: "Streak", v: "12 Day 🔥" },
              { l: "Creators", v: "Top 5%" },
            ].map((s) => (
              <div key={s.l} className="border border-border rounded-lg py-1.5">
                <div className="text-[10px] font-bold">{s.v}</div>
                <div className="text-[8px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between text-[9px] text-center">
            {[Phone, Video, Users, Mic, MoreHorizontal].map((I, i) => (
              <button key={i} className="flex flex-col items-center gap-1"><div className="h-8 w-8 rounded-full bg-muted grid place-items-center"><I className="h-3.5 w-3.5" /></div><span>{["Audio","Video","Profile","Mute","More"][i]}</span></button>
            ))}
          </div>

          <div className="mt-3">
            <div className="text-[10px] font-semibold">Chat settings</div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px]"><span>Notifications</span><div className="w-6 h-3.5 bg-brand rounded-full relative"><div className="h-3 w-3 bg-white rounded-full absolute right-0.5 top-0.5" /></div></div>
              <div className="flex items-center justify-between text-[10px]"><span>Mute chat</span><div className="w-6 h-3.5 bg-muted rounded-full relative"><div className="h-3 w-3 bg-white rounded-full absolute left-0.5 top-0.5" /></div></div>
              <div className="flex items-center justify-between text-[10px]"><span>Pinned messages</span><span className="text-muted-foreground">3</span></div>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-[10px] font-semibold mb-1">Shared in this chat</div>
            {[
              { c: "bg-emerald-500", l: "UGC Army", v: "129 messages" },
              { c: "bg-rose-500", l: "TradeHub", v: "83 messages" },
              { c: "bg-orange-500", l: "Creator School", v: "54 messages" },
            ].map((s) => (
              <div key={s.l} className="flex items-center gap-2 py-1">
                <div className={`h-5 w-5 rounded ${s.c}`} />
                <span className="text-[10px] flex-1">{s.l}</span>
                <span className="text-[9px] text-muted-foreground">{s.v}</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-3 text-[10px] font-semibold border-b border-border">
              <button className="pb-1 text-brand border-b-2 border-brand">Media</button>
              <button className="text-muted-foreground">Files</button>
              <button className="text-muted-foreground">Links</button>
              <button className="text-muted-foreground">Voice</button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className="aspect-square rounded bg-muted relative overflow-hidden">
                  <div className="absolute bottom-0.5 right-0.5 text-[8px] text-white bg-black/50 px-0.5 rounded">0:{15 + i*7}</div>
                </div>
              ))}
            </div>
            <button className="mt-2 text-[10px] text-brand font-semibold">View all media</button>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-semibold">Files</div>
              <button className="text-[9px] text-brand font-semibold">View all</button>
            </div>
            {([
              { type: "pdf" as const, n: "EURUSD_Analysis.pdf", s: "2.4 MB · PDF", c: "text-rose-600 bg-rose-500/10" },
              { type: "xlsx" as const, n: "Trading_Plan.xlsx", s: "1.1 MB · XLSX", c: "text-emerald-600 bg-emerald-500/10" },
              { type: "mp4" as const, n: "Market_Update.mp4", s: "68 MB · MP4", c: "text-blue-600 bg-blue-500/10" },
            ]).map((f) => {
              const Icon = FILE_ICONS[f.type];
              return (
                <div key={f.n} className="flex items-center gap-2 py-1">
                  <div className={`h-6 w-6 rounded grid place-items-center ${f.c}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold truncate">{f.n}</div>
                    <div className="text-[9px] text-muted-foreground">{f.s}</div>
                  </div>
                  <Download className="h-3 w-3" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MsgIn({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2 max-w-[70%]">
      <Avatar i={i} size={24} />
      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-[11px]">{children}</div>
    </div>
  );
}
function MsgOut({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="bg-emerald-100 rounded-2xl rounded-br-sm px-3 py-2 text-[11px] max-w-[70%]">{children}</div>
    </div>
  );
}
