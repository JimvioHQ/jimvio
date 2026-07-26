import Link from "next/link";
import {
  GraduationCap,
  Layers,
  Mic,
  Monitor,
  Radio,
  Scissors,
  Target,
} from "lucide-react";
import { CREATE_QUICK_LAUNCH } from "@/lib/feed/mock-data";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  radio: Radio,
  mic: Mic,
  scissors: Scissors,
  graduation: GraduationCap,
  target: Target,
  layers: Layers,
  monitor: Monitor,
} as const;

const COLOR_MAP = {
  radio: "bg-red-50 text-red-500",
  mic: "bg-violet-50 text-violet-500",
  scissors: "bg-orange-50 text-orange-500",
  graduation: "bg-orange-50 text-orange-500",
  target: "bg-orange-50 text-orange-500",
  layers: "bg-orange-50 text-orange-500",
  monitor: "bg-green-50 text-green-600",
} as const;

type CreateMenuPanelProps = {
  onItemClick?: () => void;
  className?: string;
};

export function CreateMenuPanel({ onItemClick, className }: CreateMenuPanelProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg",
        className
      )}
    >
      {CREATE_QUICK_LAUNCH.map((item, index) => {
        const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
        const colorCls = COLOR_MAP[item.icon as keyof typeof COLOR_MAP];
        const className = cn(
          "flex w-full items-center gap-4 px-3 py-3 text-left transition-colors hover:bg-gray-50",
          index > 0 && "border-t border-gray-100"
        );
        const content = (
          <>
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                colorCls
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.subtitle}</p>
            </div>
          </>
        );
        if ("href" in item && item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onItemClick}
              className={className}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={item.label}
            type="button"
            onClick={onItemClick}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
