// components/workspace/EmptyComingSoon.tsx
import { type LucideIcon, Sparkles } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  buildPhase?: string;
}

export function EmptyComingSoon({ icon: Icon, title, description, buildPhase }: Props) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center">
          <Icon className="w-7 h-7 text-[#fd5000]" />
        </div>
        <div className="absolute -top-1 -right-1 bg-[#fd5000] text-white text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          SOON
        </div>
      </div>

      <h2 className="text-[18px] font-extrabold tracking-tight text-text-primary mb-1.5">
        {title}
      </h2>
      <p className="text-[13px] text-text-muted max-w-md leading-relaxed mb-4">
        {description}
      </p>

      {buildPhase && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#fd5000] bg-[#fd5000]/10 px-2.5 py-1 rounded-full">
          {buildPhase}
        </span>
      )}
    </div>
  );
}