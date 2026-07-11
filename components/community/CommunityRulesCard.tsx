import { useState } from "react";
import { Shield } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const DEFAULT_RULES = [
  "Be respectful and collaborative",
  "No spam or unsolicited self-promotion",
  "Share helpful feedback and support",
  "Respect intellectual property rights",
];

export function CommunityRulesCard() {
  const { communityName, overview } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const rules = overview?.rules && overview.rules.length > 0 ? overview.rules : DEFAULT_RULES;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between">
      <div>
        <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Community Rules</h3>
        <ul className="mb-4 space-y-2">
          {rules.slice(0, 3).map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              {rule}
            </li>
          ))}
          {rules.length > 3 && (
            <li className="text-[11px] text-gray-400 italic pl-5">
              + {rules.length - 3} more rules
            </li>
          )}
        </ul>
      </div>
      <div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button type="button" className="text-xs font-semibold text-orange-500 hover:underline hover:text-orange-600 outline-none">
              View all rules
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>{communityName} Rules</DialogTitle>
              <DialogDescription>Please review our community guidelines.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3.5 py-2 max-h-[350px] overflow-y-auto pr-1">
              <ol className="space-y-2.5">
                {rules.map((rule, idx) => (
                  <li key={rule} className="flex items-start gap-3 text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] p-3 rounded-lg border border-[var(--color-border)]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/40 text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-normal">{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
