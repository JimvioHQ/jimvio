"use client";

import { MoreHorizontal, Paperclip, Send, Smile } from "lucide-react";

export function ChatComposer() {
  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Emoji" className="text-gray-400 hover:text-gray-600">
          <Smile className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Attach" className="text-gray-400 hover:text-gray-600">
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-orange-300 focus:bg-white"
        />
        <button type="button" aria-label="GIF" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
          GIF
        </button>
        <button
          type="button"
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ChatColumnHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <button type="button" aria-label="More options" className="text-gray-400 hover:text-gray-600">
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
