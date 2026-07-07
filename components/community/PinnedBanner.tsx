import { Pin } from "lucide-react";

type PinnedBannerProps = {
  author: string;
  text: string;
};

export function PinnedBanner({ author, text }: PinnedBannerProps) {
  return (
    <div className="flex items-start gap-2 border-b border-orange-100 bg-orange-50 px-4 py-2.5">
      <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
      <p className="text-sm text-gray-800">
        <span className="font-semibold">{author}</span> {text}
      </p>
    </div>
  );
}

export function TypingIndicator({ name }: { name: string }) {
  return (
    <p className="px-4 py-1 text-xs text-gray-400">{name} is typing...</p>
  );
}
