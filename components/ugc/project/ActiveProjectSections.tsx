"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Paperclip,
  Play,
  Plus,
  Search,
  Send,
  StickyNote,
  Upload,
  AlertTriangle,
} from "lucide-react";
import type { UGCCampaign, UGCSubmission } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { useAIStore } from "@/lib/store/use-ai-store";
import {
  deriveProjectStage,
  deriveProjectStats,
  buildProjectTasks,
  buildMilestones,
  buildActivityFeed,
  buildReminders,
  getProjectMeta,
  STAGE_ORDER,
  STAGE_LABELS,
  type ProjectTask,
  type ParticipantInfo,
} from "@/lib/ugc/active-project";
import {
  getProjectNotes,
  saveProjectNotes,
  getProjectFiles,
  saveProjectFiles,
  getProjectMessages,
  appendProjectMessage,
  markBriefRead,
  markAssetsDownloaded,
  type ProjectFile,
  type ProjectMessage,
  type ProjectNote,
} from "@/lib/ugc/project-storage";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { cn } from "@/lib/utils";
import { ProjectCard, ProjectMetric, ProjectSectionTitle } from "./active-project-ui";

type ActiveProjectSectionsProps = {
  campaign: UGCCampaign;
  campaignId: string;
  submissions: UGCSubmission[];
  participant: ParticipantInfo;
  canAccessResources: boolean;
  flags: { briefRead: boolean; assetsDownloaded: boolean };
  onFlagsChange: () => void;
};

type FilterMode = "all" | "todo" | "in_progress" | "done";
type SortMode = "newest" | "deadline" | "priority";

function CollapsibleCard({
  id,
  title,
  sub,
  defaultOpen = true,
  children,
}: {
  id?: string;
  title: string;
  sub?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <ProjectCard id={id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left lg:pointer-events-none"
      >
        <ProjectSectionTitle sub={sub}>{title}</ProjectSectionTitle>
        <span className="text-[12px] font-semibold text-[#9CA3AF] lg:hidden">{open ? "−" : "+"}</span>
      </button>
      <div className={cn(!open && "hidden lg:block")}>{children}</div>
    </ProjectCard>
  );
}

function taskStatusIcon(status: ProjectTask["status"]) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-amber-500" />;
  if (status === "blocked") return <AlertTriangle className="h-4 w-4 text-rose-500" />;
  return <Circle className="h-4 w-4 text-[#D1D5DB]" />;
}

export function ActiveProjectSections({
  campaign,
  campaignId,
  submissions,
  participant,
  canAccessResources,
  flags,
  onFlagsChange,
}: ActiveProjectSectionsProps) {
  const { formatMoney } = useCurrency();
  const openAssistant = useAIStore((s) => s.openAssistant);

  const stage = deriveProjectStage(campaign, submissions, participant);
  const stats = deriveProjectStats(campaign, submissions, stage);
  const meta = getProjectMeta(campaign);
  const tasks = buildProjectTasks(campaign, submissions, flags);
  const milestones = buildMilestones(participant, submissions, campaign);
  const activity = buildActivityFeed(participant, submissions, campaign);
  const reminders = buildReminders(campaign, submissions);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("priority");
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setNotes(getProjectNotes(campaignId));
    setFiles(getProjectFiles(campaignId));
    setMessages(getProjectMessages(campaignId));
  }, [campaignId]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.label.toLowerCase().includes(q));
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (sort === "priority") list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    if (sort === "deadline")
      list.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    return list;
  }, [tasks, filter, search, sort]);

  const filteredResources = useMemo(() => {
    if (!search.trim()) return meta.resources;
    const q = search.toLowerCase();
    return meta.resources.filter(
      (r) => r.label.toLowerCase().includes(q) || r.source.toLowerCase().includes(q),
    );
  }, [meta.resources, search]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleDownloadAssets = useCallback(() => {
    markAssetsDownloaded(campaignId);
    onFlagsChange();
    scrollTo("resources");
  }, [campaignId, onFlagsChange, scrollTo]);

  const handleOpenBrief = useCallback(() => {
    markBriefRead(campaignId);
    onFlagsChange();
  }, [campaignId, onFlagsChange]);

  const saveNote = useCallback(() => {
    if (!noteDraft.trim()) return;
    const next: ProjectNote[] = [
      { id: crypto.randomUUID(), content: noteDraft.trim(), updatedAt: new Date().toISOString() },
      ...notes,
    ];
    saveProjectNotes(campaignId, next);
    setNotes(next);
    setNoteDraft("");
  }, [campaignId, noteDraft, notes]);

  const sendMessage = useCallback(() => {
    if (!messageDraft.trim()) return;
    const next = appendProjectMessage(campaignId, { from: "creator", body: messageDraft.trim() });
    setMessages(next);
    setMessageDraft("");
  }, [campaignId, messageDraft]);

  const addFile = useCallback(
    (name: string, kind: ProjectFile["kind"]) => {
      const next: ProjectFile[] = [
        { id: crypto.randomUUID(), name, kind, createdAt: new Date().toISOString() },
        ...files,
      ];
      saveProjectFiles(campaignId, next);
      setFiles(next);
    },
    [campaignId, files],
  );

  const creatorGoal =
    campaign.payment_model === "fixed_per_content"
      ? `Earn ${formatMoney(campaign.fixed_rate ?? 0, "USD")} per approved submission`
      : `Earn up to ${formatMoney(campaign.max_payout_per_sub ?? 400, "USD")} based on views`;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search & filters */}
      <ProjectCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, resources, messages, files…"
              className="w-full rounded-xl border border-[#E5E7EB] py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[#9CA3AF]" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterMode)}
              className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-[12px]"
            >
              <option value="all">All status</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-[12px]"
            >
              <option value="priority">Priority</option>
              <option value="deadline">Deadline</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </ProjectCard>

      {/* Dashboard metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <ProjectMetric label="Reward type" value={meta.rewardType} />
        <ProjectMetric
          label="Estimated earnings"
          value={formatMoney(stats.estimatedEarnings, "USD")}
        />
        <ProjectMetric label="Current earnings" value={formatMoney(stats.currentEarnings, "USD")} />
        <ProjectMetric
          label="Approved views"
          value={stats.approvedViews.toLocaleString()}
          sub={`${stats.pendingViews.toLocaleString()} pending · ${stats.rejectedViews.toLocaleString()} rejected`}
        />
      </div>

      {/* Reminders */}
      {reminders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {reminders.map((r) => (
            <Pill
              key={r.id}
              tone={r.tone === "warning" ? "warning" : r.tone === "success" ? "success" : "info"}
            >
              {r.label}
            </Pill>
          ))}
        </div>
      ) : null}

      {/* Quick actions */}
      <ProjectCard id="quick-actions">
        <ProjectSectionTitle sub="Common workspace actions">Quick actions</ProjectSectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Submit content", href: `/ugc/${campaignId}/submit`, primary: true },
            { label: "Download assets", onClick: handleDownloadAssets },
            { label: "Open brief", href: `/ugc/${campaignId}`, onClick: handleOpenBrief },
            { label: "Message brand", onClick: () => scrollTo("messages") },
            { label: "View requirements", onClick: () => scrollTo("requirements") },
            { label: "Report issue", href: "/help" },
          ].map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                onClick={action.onClick}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-center text-[12px] font-semibold transition-colors",
                  action.primary
                    ? "border-[#FF5A1F] bg-[#FFF4EF] text-[#FF5A1F]"
                    : "border-[#E5E7EB] bg-[#FAFAFA] text-[#374151] hover:bg-white",
                )}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5 text-[12px] font-semibold text-[#374151] hover:bg-white"
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      </ProjectCard>

      {/* Progress stages */}
      <CollapsibleCard title="Project progress" sub="Your journey from join to payout">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STAGE_ORDER.map((s) => {
            const idx = STAGE_ORDER.indexOf(stage);
            const current = STAGE_ORDER.indexOf(s);
            const done = current < idx;
            const active = s === stage;
            return (
              <div
                key={s}
                className={cn(
                  "min-w-[72px] flex-1 rounded-lg px-2 py-2 text-center text-[10px] font-bold",
                  done && "bg-emerald-50 text-emerald-700",
                  active && "bg-[#FFF4EF] text-[#FF5A1F] ring-1 ring-[#FFE4D6]",
                  !done && !active && "bg-[#F9FAFB] text-[#9CA3AF]",
                )}
              >
                {STAGE_LABELS[s]}
              </div>
            );
          })}
        </div>
      </CollapsibleCard>

      {/* Overview */}
      <CollapsibleCard title="Project overview" sub="Goals, criteria, and brand updates">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">Campaign goal</p>
            <p className="mt-1 text-[13px] text-[#374151]">
              {campaign.promotion_target ?? campaign.description?.slice(0, 160) ?? "Drive authentic creator content for this brand."}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">Creator goal</p>
            <p className="mt-1 text-[13px] text-[#374151]">{creatorGoal}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">Description</p>
            <p className="mt-1 text-[13px] text-[#374151]">{campaign.description ?? "No description provided."}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">Success criteria</p>
            <ul className="mt-1 list-inside list-disc text-[13px] text-[#374151]">
              <li>Follow platform and duration requirements</li>
              <li>Include required hashtags and mentions</li>
              <li>Submit original content for brand review</li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">Important notes</p>
            <p className="mt-1 text-[13px] text-[#374151]">
              {campaign.content_guidelines ?? "Review the campaign brief before creating content."}
            </p>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-3">
            <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">Latest announcements</p>
            <p className="mt-1 text-[13px] text-[#374151]">
              Campaign status: <strong>{campaign.status}</strong>
              {campaign.updated_at
                ? ` · Last updated ${new Date(campaign.updated_at).toLocaleDateString()}`
                : null}
            </p>
          </div>
        </div>
      </CollapsibleCard>

      {/* Tasks */}
      <CollapsibleCard title="Tasks" sub="Your step-by-step checklist">
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 rounded-xl border border-[#EEF0F2] p-3"
            >
              {taskStatusIcon(task.status)}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-[#111827]">{task.label}</p>
                  <Pill tone={task.priority === "high" ? "danger" : task.priority === "medium" ? "warning" : "neutral"}>
                    {task.priority}
                  </Pill>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[#6B7280]">
                  <span className="capitalize">{task.status.replace("_", " ")}</span>
                  {task.deadline ? (
                    <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
                  ) : null}
                  <span>{task.progress}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                  <div
                    className="h-full rounded-full bg-[#FF5A1F] transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Milestones */}
      <CollapsibleCard title="Milestones" sub="Key project checkpoints" defaultOpen={false}>
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <div key={m.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  m.status === "done" && "bg-emerald-500 text-white",
                  m.status === "current" && "bg-[#FF5A1F] text-white",
                  m.status === "upcoming" && "bg-[#E5E7EB] text-[#6B7280]",
                )}
              >
                {i + 1}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">{m.label}</p>
                {m.date ? (
                  <p className="text-[11px] text-[#6B7280]">{new Date(m.date).toLocaleDateString()}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Timeline & activity */}
      <CollapsibleCard title="Timeline" sub="Chronological project activity" defaultOpen={false}>
        <div className="space-y-3 border-l-2 border-[#EEF0F2] pl-4">
          {activity.map((item) => (
            <div key={item.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#FF5A1F]" />
              <p className="text-[13px] font-semibold text-[#111827]">{item.title}</p>
              {item.detail ? <p className="text-[11px] text-[#6B7280]">{item.detail}</p> : null}
              <p className="text-[10px] text-[#9CA3AF]">{new Date(item.at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Activity feed" sub="Submissions, reviews, and updates" defaultOpen={false}>
        <div className="space-y-2">
          {activity.slice(0, 8).map((item) => (
            <div key={`feed-${item.id}`} className="rounded-lg bg-[#FAFAFA] px-3 py-2">
              <p className="text-[12px] font-medium text-[#111827]">{item.title}</p>
              <p className="text-[10px] text-[#9CA3AF]">{new Date(item.at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Resources */}
      <CollapsibleCard
        id="resources"
        title="Resources"
        sub={canAccessResources ? "Brand assets and reference materials" : "Unlock after approval"}
      >
        {!canAccessResources ? (
          <p className="text-[13px] text-[#6B7280]">Resources unlock once your participation is approved.</p>
        ) : filteredResources.length === 0 ? (
          <p className="text-[13px] text-[#6B7280]">No resources uploaded for this campaign yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredResources.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-[#EEF0F2] p-3"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF4EF]">
                  {r.type === "video" ? (
                    <Play className="h-4 w-4 text-[#FF5A1F]" />
                  ) : (
                    <Download className="h-4 w-4 text-[#FF5A1F]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#111827]">{r.label}</p>
                  <p className="text-[11px] text-[#6B7280]">{r.source}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {r.previewable ? (
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(r.url)}
                      className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-[11px] font-semibold"
                    >
                      Preview
                    </button>
                  ) : null}
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      markAssetsDownloaded(campaignId);
                      onFlagsChange();
                    }}
                    className="rounded-lg bg-[#FF5A1F] px-2 py-1 text-[11px] font-semibold text-white"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Project files */}
      <CollapsibleCard title="Project files" sub="Your private workspace drafts and uploads" defaultOpen={false}>
        <div className="mb-3 flex flex-wrap gap-2">
          {(["draft", "video", "screenshot", "document"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => addFile(`${kind}-${Date.now()}.${kind === "video" ? "mp4" : "file"}`, kind)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[11px] font-semibold capitalize"
            >
              <Upload className="h-3 w-3" />
              Add {kind}
            </button>
          ))}
        </div>
        {files.length === 0 ? (
          <p className="text-[13px] text-[#6B7280]">No files yet. Add drafts, notes, or screenshots.</p>
        ) : (
          <div className="space-y-2">
            {files
              .filter((f) => !search.trim() || f.name.toLowerCase().includes(search.toLowerCase()))
              .map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-lg bg-[#FAFAFA] px-3 py-2">
                  <FileText className="h-4 w-4 text-[#9CA3AF]" />
                  <span className="flex-1 truncate text-[12px] font-medium">{f.name}</span>
                  <Pill tone="neutral">{f.kind}</Pill>
                </div>
              ))}
          </div>
        )}
      </CollapsibleCard>

      {/* Messages */}
      <CollapsibleCard id="messages" title="Messages" sub="Creator ↔ Brand conversation" defaultOpen={false}>
        <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-[13px] text-[#6B7280]">No messages yet. Say hello to the brand team.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-[12px]",
                  m.from === "creator" ? "ml-auto bg-[#FFF4EF] text-[#374151]" : "bg-[#F3F4F6] text-[#374151]",
                )}
              >
                <p>{m.body}</p>
                <p className="mt-1 text-[10px] text-[#9CA3AF]">{new Date(m.at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            placeholder="Message the brand…"
            className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            type="button"
            onClick={sendMessage}
            className="rounded-xl bg-[#FF5A1F] px-3 text-white"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-[#9CA3AF]">
          <Paperclip className="h-3 w-3" />
          Attachments supported in full messaging (images, videos, documents)
        </p>
      </CollapsibleCard>

      {/* Notes */}
      <CollapsibleCard title="Private notes" sub="Only visible to you" defaultOpen={false}>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Jot down ideas, scripts, or shot lists…"
          rows={3}
          className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={saveNote}
          className="mt-2 inline-flex items-center gap-1 rounded-xl bg-[#111827] px-3 py-2 text-[12px] font-semibold text-white"
        >
          <StickyNote className="h-3.5 w-3.5" />
          Save note
        </button>
        {notes.length > 0 ? (
          <div className="mt-3 space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-[#FAFAFA] p-3 text-[12px] text-[#374151]">
                {n.content}
                <p className="mt-1 text-[10px] text-[#9CA3AF]">
                  {new Date(n.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CollapsibleCard>

      {/* Submissions */}
      <CollapsibleCard title="Your submissions" sub="Track review status and earnings">
        {submissions.length === 0 ? (
          <div className="text-center">
            <p className="text-[13px] text-[#6B7280]">No submissions yet.</p>
            <Link
              href={`/ugc/${campaignId}/submit`}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#FF5A1F] px-4 py-2 text-[12px] font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Submit content
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-[#EEF0F2] p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        s.status === "approved"
                          ? "success"
                          : s.status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {s.status}
                    </Pill>
                    <span className="text-[12px] font-semibold uppercase">{s.platform}</span>
                  </div>
                  <a
                    href={s.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-[12px] text-[#FF5A1F]"
                  >
                    View post <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-[11px] text-[#6B7280]">
                    {(s.total_views_earned ?? 0).toLocaleString()} views ·{" "}
                    {formatMoney(Number(s.total_earnings) || 0, "USD")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* AI Assistant */}
      <ProjectCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <ProjectSectionTitle sub="Context-aware help for this campaign">
              AI assistant
            </ProjectSectionTitle>
            <p className="text-[12px] text-[#6B7280]">
              Ask about requirements, ideas, scripts, deadlines, and resources.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              openAssistant(
                `Help me with the "${campaign.title}" campaign. Current stage: ${STAGE_LABELS[stage]}. What should I do next?`,
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-[12px] font-semibold text-white"
          >
            <Bot className="h-4 w-4" />
            Open assistant
          </button>
        </div>
      </ProjectCard>

      {/* Preview modal */}
      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewUrl(null)}
          role="presentation"
        >
          <div
            className="max-h-[80vh] max-w-3xl overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="max-h-[70vh] w-full object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
