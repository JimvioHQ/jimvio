"use client";

import React, { useState } from "react";
import {
  Search,
  Phone,
  Video,
  Info,
  MoreVertical,
  Mic,
  Pin,
  X,
  CheckCheck,
  Bell,
  VolumeX,
  FileText,
  Download,
  Play,
  Pause,
  Layers,
  Users,
  Flame,
  ChevronRight,
  User,
} from "lucide-react";
import { Conversation, ChatMessage, ScreenId } from "./types";
import {
  INITIAL_CONVERSATIONS,
  CURRENT_USER,
  MOCK_USERS,
  INITIAL_COMMUNITIES,
} from "./supabaseStore";
import { Avatar } from "./Avatar";
import { Badge } from "@/components/common/Badge";
import { Composer } from "./Composer";
import { cn } from "@/lib/utils";

interface MessagingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const MessagingScreen: React.FC<MessagingScreenProps> = ({
  onNavigate,
}) => {
  const [conversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>(INITIAL_CONVERSATIONS[0].id);
  const [convFilter, setConvFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBannerDismissed, setIsDismissed] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(45);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [muteEnabled, setMuteEnabled] = useState(false);
  const [mediaTab, setMediaTab] = useState("Files");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "dm-1",
      sender: MOCK_USERS["u-june"],
      timestamp: "10:12 AM",
      content: "Hi Mira! I finalized the direct Japanese ceramic sourcing guide for our new creators. Please review the customs declaration limits below:",
      attachment: {
        type: "pdf",
        url: "https://example.com/Ceramic_Sourcing_Guide_v2.pdf",
        fileName: "Ceramic_Sourcing_Guide_v2.pdf",
        fileSize: "4.1 MB",
      },
      reactions: [{ emoji: "❤️", count: 2, userReacted: true }],
      seenBy: [CURRENT_USER],
    },
    {
      id: "dm-2",
      sender: CURRENT_USER,
      timestamp: "10:14 AM",
      content: "Received! The customs breakdown for Seto imports looks spotless. Here is a quick audio note on how we will present this in tomorrow's live masterclass:",
      attachment: {
        type: "audio",
        url: "https://example.com/audio-dm.mp3",
        fileName: "Live_Class_Presentation_Note.mp3",
        durationSeconds: 38,
      },
      reactions: [{ emoji: "🔥", count: 1, userReacted: true }],
      seenBy: [MOCK_USERS["u-june"]],
    },
    {
      id: "dm-3",
      sender: MOCK_USERS["u-june"],
      timestamp: "10:16 AM",
      content: "Perfect. I pinned order #842 tracking to our thread so we can verify exact crate arrival during the stream.",
      reactions: [],
      seenBy: [CURRENT_USER],
    },
  ]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const handleAudioToggle = () => {
    if (isPlayingAudio) setIsPlayingAudio(false);
    else {
      setIsPlayingAudio(true);
      const timer = setInterval(() => {
        setAudioProgress((p) => {
          if (p >= 100) {
            clearInterval(timer);
            setIsPlayingAudio(false);
            return 0;
          }
          return p + 10;
        });
      }, 500);
    }
  };

  const handleSendDM = (text: string, attachmentType?: string) => {
    const newMsg: ChatMessage = {
      id: `dm-${Date.now()}`,
      sender: CURRENT_USER,
      timestamp: "Just now",
      content: text,
      attachment:
        attachmentType === "course"
          ? {
              type: "pdf",
              url: "https://example.com/Course_Curriculum_Syllabus.pdf",
              fileName: "Mastering_V60_Course_Syllabus.pdf",
              fileSize: "3.2 MB",
            }
          : undefined,
      reactions: [],
      seenBy: [],
    };
    setMessages([...messages, newMsg]);
  };

  const filteredConversations = conversations.filter((c) => {
    if (convFilter === "Unread") return c.unreadCount > 0;
    if (convFilter === "Groups") return c.isGroup;
    if (convFilter === "Spaces") return c.isSpace;
    return true;
  }).filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm overflow-hidden h-[calc(100vh-6.5rem)] min-w-0 mx-2 sm:mx-6 my-2 sm:my-4">
      {/* Column 1: Conversations List (4 cols on desktop) */}
      <div className="md:col-span-4 lg:col-span-3 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] min-w-0">
        {/* Header & Search */}
        <div className="p-3.5 space-y-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[var(--color-text)]">
              Direct Messages
            </h2>
            <Badge variant="count">3 New</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages or spaces..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] pl-8 pr-3 py-1.5 font-body text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
            {["All", "Unread", "Groups", "Spaces"].map((tab) => (
              <button
                key={tab}
                onClick={() => setConvFilter(tab)}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition shrink-0",
                  convFilter === tab
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]/50 no-scrollbar">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConvId;
            return (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setIsDismissed(false);
                }}
                className={cn(
                  "flex items-start gap-3 p-3.5 cursor-pointer transition relative",
                  isSelected
                    ? "bg-[var(--color-accent)]/10 font-medium"
                    : "hover:bg-[var(--color-surface-hover)]"
                )}
              >
                {isSelected && (
                  <span className="absolute left-0 inset-y-0 w-1 bg-[var(--color-accent)]" />
                )}

                <div className="relative shrink-0">
                  <Avatar
                    src={conv.avatar}
                    alt={conv.title}
                    size="md"
                    status={conv.participant?.status || "online"}
                  />
                  {conv.isGroup && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white shadow ring-1 ring-[var(--color-card)]" title="Group">
                      <Users className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {conv.isSpace && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] text-white shadow ring-1 ring-[var(--color-card)]" title="Space">
                      <Layers className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn("font-display text-xs sm:text-sm truncate", isSelected ? "font-bold text-[var(--color-text)]" : "font-semibold text-[var(--color-text)]")}>
                      {conv.title}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-text-secondary)] shrink-0">
                      {conv.lastMessageTime}
                    </span>
                  </div>

                  {conv.isTyping ? (
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--color-accent)] animate-pulse">
                      <span>typing...</span>
                    </div>
                  ) : (
                    <p className="font-body text-xs text-[var(--color-text-secondary)] line-clamp-1">
                      {conv.lastMessage}
                    </p>
                  )}
                </div>

                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 font-mono text-[10px] font-bold text-white shadow">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 2: Active Thread Area (5 cols or 8 when right panel hidden) */}
      <div className={cn("flex flex-col min-w-0 bg-[var(--color-card)]", showRightPanel ? "md:col-span-8 lg:col-span-6" : "md:col-span-8 lg:col-span-9")}>
        {/* Thread Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-3.5 bg-[var(--color-surface)]">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={activeConv.avatar} alt={activeConv.title} size="md" status={activeConv.participant?.status || "online"} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm sm:text-base font-bold text-[var(--color-text)] truncate">
                  {activeConv.title}
                </h3>
                {activeConv.isSpace ? (
                  <Badge variant="tier">Space Channel</Badge>
                ) : (
                  <span className="font-mono text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Online now
                  </span>
                )}
              </div>
              <div className="font-mono text-xs text-[var(--color-text-secondary)] truncate">
                {activeConv.isSpace ? "House Matters Guild • #general-chat" : "June Park • Co-creator & Studio Lead"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => alert(`Launching private Audio Table Talk with ${activeConv.title}...`)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-3 py-1.5 font-mono text-xs font-bold text-white shadow transition"
            >
              <Mic className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Start Voice Room</span>
            </button>

            <button
              onClick={() => alert("Calling...")}
              className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-text-secondary)] transition"
              title="Call"
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              onClick={() => alert("Starting Video Call...")}
              className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-text-secondary)] transition"
              title="Video Call"
            >
              <Video className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={cn(
                "h-9 w-9 rounded-xl border flex items-center justify-center transition",
                showRightPanel
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)]"
              )}
              title="Toggle About Panel"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Pinned Message Banner inside Thread */}
        {!isBannerDismissed && activeConv.pinnedMessage && (
          <div className="flex items-center justify-between gap-3 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2 min-w-0">
              <Pin className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 fill-amber-500" />
              <span className="truncate font-body">{activeConv.pinnedMessage}</span>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="h-6 w-6 rounded hover:bg-amber-500/20 flex items-center justify-center shrink-0"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Message Bubbles Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          <div className="text-center my-2">
            <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
              Yesterday • 10:12 AM
            </span>
          </div>

          {messages.map((msg) => {
            const isSentByMe = msg.sender.id === CURRENT_USER.id;
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col gap-1 max-w-[85%] sm:max-w-[75%]", isSentByMe ? "ml-auto items-end" : "mr-auto items-start")}
              >
                <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--color-text-secondary)] px-1">
                  <span>{msg.sender.name}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={cn(
                    "rounded-2xl p-3.5 shadow-sm font-body text-sm sm:text-[14.5px] leading-relaxed whitespace-pre-line break-words w-full",
                    isSentByMe
                      ? "bg-[var(--color-accent)] text-white rounded-br-xs"
                      : "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-xs"
                  )}
                >
                  <p className="mb-2">{msg.content}</p>

                  {msg.attachment && msg.attachment.type === "pdf" && (
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl p-3 mt-2 border transition",
                        isSentByMe
                          ? "bg-black/20 border-white/20 text-white"
                          : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text)]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-5 w-5 text-red-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold truncate">
                            {msg.attachment.fileName}
                          </div>
                          <div className="font-mono text-[10px] opacity-80">
                            {msg.attachment.fileSize || "4.1 MB"} • Confirmed Scan
                          </div>
                        </div>
                      </div>
                      <a
                        href={msg.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                          isSentByMe ? "bg-white/20 hover:bg-white/30" : "bg-[var(--color-surface)] hover:bg-[var(--color-accent)] hover:text-white"
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {msg.attachment && msg.attachment.type === "audio" && (
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-3 mt-2 border",
                        isSentByMe
                          ? "bg-black/20 border-white/20 text-white"
                          : "bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text)]"
                      )}
                    >
                      <button
                        onClick={handleAudioToggle}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow transition",
                          isSentByMe ? "bg-white text-[var(--color-accent)] font-bold" : "bg-[var(--color-accent)] text-white"
                        )}
                      >
                        {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px] opacity-90">
                          <span>Audio Note ({msg.attachment.durationSeconds || 38}s)</span>
                          <span>{isPlayingAudio ? `${audioProgress}%` : "0:00"}</span>
                        </div>
                        <div className="flex items-center gap-1 h-5 overflow-hidden">
                          {[6, 12, 18, 10, 15, 20, 14, 22, 16, 12, 18, 8, 14, 20, 16, 12, 8].map((h, i) => (
                            <div
                              key={i}
                              className={cn("w-1 rounded-full transition-all", isSentByMe ? "bg-white" : "bg-[var(--color-accent)]")}
                              style={{ height: `${h}px`, opacity: i / 17 <= audioProgress / 100 ? 1 : 0.4 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={cn("flex items-center justify-between pt-1.5 mt-1 border-t text-[10.5px] font-mono", isSentByMe ? "border-white/20 text-white/90" : "border-[var(--color-border)]/60 text-[var(--color-text-secondary)]")}>
                    <div className="flex items-center gap-1">
                      {msg.reactions.map((r, idx) => (
                        <span key={idx} className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-bold">
                          {r.emoji} {r.count}
                        </span>
                      ))}
                    </div>
                    {isSentByMe && (
                      <span className="flex items-center gap-1">
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Read 10:14 AM</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
          <Composer
            variant="dm"
            placeholder={`Message ${activeConv.title}...`}
            onSubmit={handleSendDM}
          />
        </div>
      </div>

      {/* Column 3: Right Panel */}
      {showRightPanel && (
        <div className="hidden lg:flex lg:col-span-3 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] overflow-y-auto no-scrollbar p-4 space-y-5 min-w-0 animate-in fade-in duration-150">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            About This Chat
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center space-y-2.5 shadow-sm">
            <Avatar
              src={activeConv.avatar}
              alt={activeConv.title}
              size="xl"
              status={activeConv.participant?.status || "online"}
              className="mx-auto"
            />
            <div>
              <h3 className="font-display text-base font-bold text-[var(--color-text)]">
                {activeConv.title}
              </h3>
              <p className="font-mono text-xs text-[var(--color-accent)] font-semibold mt-0.5">
                {activeConv.participant?.creatorLevel || "Level 5 Studio Lead"}
              </p>
              <div className="flex items-center justify-center gap-1.5 font-mono text-xs text-[var(--color-text-secondary)] mt-1">
                <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>42 Day Streak</span>
                <span>•</span>
                <Badge variant="tier">Top Creator</Badge>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[var(--color-border)]/60 font-mono text-[10.5px]">
              <button
                onClick={() => alert("Audio Call...")}
                className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-hover)] transition"
              >
                <Phone className="h-4 w-4 text-[var(--color-accent)]" />
                <span>Audio</span>
              </button>
              <button
                onClick={() => alert("Video Call...")}
                className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-hover)] transition"
              >
                <Video className="h-4 w-4 text-blue-500" />
                <span>Video</span>
              </button>
              <button
                onClick={() => alert("Opening creator profile & portfolio...")}
                className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-hover)] transition"
              >
                <User className="h-4 w-4 text-indigo-500" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => alert("More thread options")}
                className="flex flex-col items-center gap-1 rounded-xl bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-hover)] transition"
              >
                <MoreVertical className="h-4 w-4 text-slate-400" />
                <span>More</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3 shadow-sm font-body text-xs">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              Chat Settings
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-500" />
                <span>Notifications</span>
              </span>
              <button
                onClick={() => setNotifEnabled(!notifEnabled)}
                className={cn("w-9 h-5 rounded-full p-0.5 transition-colors", notifEnabled ? "bg-emerald-500" : "bg-slate-400")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform", notifEnabled && "translate-x-4")} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <VolumeX className="h-4 w-4 text-amber-500" />
                <span>Mute chat alerts</span>
              </span>
              <button
                onClick={() => setMuteEnabled(!muteEnabled)}
                className={cn("w-9 h-5 rounded-full p-0.5 transition-colors", muteEnabled ? "bg-amber-500" : "bg-slate-400")}
              >
                <div className={cn("h-4 w-4 rounded-full bg-white transition-transform", muteEnabled && "translate-x-4")} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]/60 font-mono text-[11px] text-[var(--color-text-secondary)]">
              <span>Pinned messages count:</span>
              <span className="font-bold text-[var(--color-text)]">2 pinned</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2.5 shadow-sm">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Shared Communities
            </div>
            <div
              onClick={() => onNavigate("community-overview")}
              className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] p-2.5 hover:bg-[var(--color-surface-hover)] cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <img src={INITIAL_COMMUNITIES[0].icon} alt="Guild" className="h-8 w-8 rounded-lg object-cover" />
                <div>
                  <div className="font-display text-xs font-bold text-[var(--color-text)]">
                    House Matters Guild
                  </div>
                  <div className="font-mono text-[10px] text-emerald-500">Co-leads inside</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Shared Media & Files
              </div>
              <button
                onClick={() => alert("Opening full thread media gallery & files ledger...")}
                className="font-mono text-[10px] text-[var(--color-accent)] font-semibold hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--color-surface)] p-1 font-mono text-[10px] text-center">
              {["Files", "Links", "Voice"].map((t) => (
                <button
                  key={t}
                  onClick={() => setMediaTab(t)}
                  className={cn("rounded-md py-1 font-bold transition", mediaTab === t ? "bg-[var(--color-card)] text-[var(--color-accent)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]")}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-2 font-mono text-xs">
              {mediaTab === "Files" && (
                <>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition cursor-pointer">
                    <span className="truncate">Seto_Invoice_Apr26.pdf</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">2.4 MB</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition cursor-pointer">
                    <span className="truncate">Ceramic_Sourcing_v2.pdf</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">4.1 MB</span>
                  </div>
                </>
              )}
              {mediaTab === "Links" && (
                <div className="p-2 rounded-lg bg-[var(--color-surface)] text-[11px] text-[var(--color-accent)] truncate">
                  https://jimvio.com/sourcing/kobe-customs
                </div>
              )}
              {mediaTab === "Voice" && (
                <div className="p-2 rounded-lg bg-[var(--color-surface)] flex items-center justify-between text-xs">
                  <span>Voice Note (0:38)</span>
                  <span className="text-emerald-500 font-bold">Played ✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
