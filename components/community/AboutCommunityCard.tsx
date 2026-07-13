import { useState } from "react";
import { Check } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const DEFAULT_FEATURES = [
  "Topic-based rooms & spaces",
  "Live streams & events calendar",
  "Learning courses & modules",
  "Ecosystem marketplace products",
];

export function AboutCommunityCard() {
  const { communityName, overview } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const description = overview?.description || 
    "A community for UGC creators, traders, and digital entrepreneurs. Learn, collaborate, and earn together through live sessions, missions, and shared resources.";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col justify-between">
      <div>
        <h3 className="mb-2 text-sm font-bold text-[var(--color-text-primary)]">About {communityName}</h3>
        <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
          {description}
        </p>
        <ul className="mb-4 space-y-1.5">
          {DEFAULT_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button type="button" className="text-xs font-semibold text-[var(--color-accent)] hover:underline hover:text-[var(--color-accent-hover)] outline-none">
              Learn about us
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>About {communityName}</DialogTitle>
              <DialogDescription>Overview and features of the workspace.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
                {description}
              </p>
              <div className="h-px bg-[var(--color-border)]" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Core Offerings</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEFAULT_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] p-2.5 rounded-lg border border-[var(--color-border)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
