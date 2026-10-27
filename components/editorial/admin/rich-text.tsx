"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/components/editorial/editorial.module.css";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import { isSafeHref } from "@/lib/editorial/validate";

function run(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [link, setLink] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || document.activeElement === node) return;
    const next = value || "";
    if (node.innerHTML !== next) node.innerHTML = next;
  }, [value]);

  function emit() {
    onChange(ref.current?.innerHTML ?? "");
  }

  function applyLink() {
    const href = link.trim();
    if (!isSafeHref(href)) return;
    ref.current?.focus();
    run("createLink", href);
    setLinkOpen(false);
    setLink("");
    emit();
  }

  const buttonClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold text-[#344054] hover:bg-[#f4f5f7]";

  return (
    <div className="overflow-hidden rounded-xl border border-[#e6e8ee] bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#eef0f4] px-2 py-1.5">
        <label className="sr-only" htmlFor="media-block">
          Paragraph style
        </label>
        <select
          id="media-block"
          className="h-8 rounded-md bg-transparent px-1 text-sm text-[#344054]"
          defaultValue="p"
          onChange={(event) => {
            const block = event.target.value === "h2" ? "H2" : event.target.value === "h3" ? "H3" : "P";
            ref.current?.focus();
            run("formatBlock", block);
            emit();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
        <button type="button" className={buttonClass} aria-label="Bold" onClick={() => { run("bold"); emit(); }}>B</button>
        <button type="button" className={`${buttonClass} italic`} aria-label="Italic" onClick={() => { run("italic"); emit(); }}>I</button>
        <button type="button" className={`${buttonClass} underline`} aria-label="Underline" onClick={() => { run("underline"); emit(); }}>U</button>
        <button type="button" className={buttonClass} aria-label="Bulleted list" onClick={() => { run("insertUnorderedList"); emit(); }}>• List</button>
        <button type="button" className={buttonClass} aria-label="Numbered list" onClick={() => { run("insertOrderedList"); emit(); }}>1. List</button>
        <button type="button" className={buttonClass} aria-label="Quote" onClick={() => { run("formatBlock", "BLOCKQUOTE"); emit(); }}>&ldquo;</button>
        <button type="button" className={buttonClass} onClick={() => setLinkOpen((open) => !open)}>Link</button>
      </div>
      {linkOpen ? (
        <div className="flex gap-2 border-b border-[#eef0f4] px-3 py-2">
          <label className="sr-only" htmlFor="media-link">Link URL</label>
          <input
            id="media-link"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://"
            className="h-9 flex-1 rounded-lg border border-[#e6e8ee] px-3 text-sm outline-none focus:border-[#fd5000]"
          />
          <button type="button" className="h-9 rounded-lg bg-[#172033] px-3 text-sm font-semibold text-white" onClick={applyLink}>
            Add link
          </button>
        </div>
      ) : null}
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Article content"
        data-placeholder="Write your article content here..."
        className={`${styles.editor} min-h-[220px] px-4 py-3 text-[15px] leading-7 text-[#172033]`}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={(event) => {
          event.preventDefault();
          const raw = event.clipboardData.getData("text/html") || event.clipboardData.getData("text/plain");
          const safe = sanitizeArticleHtml(raw.includes("<") ? raw : `<p>${raw}</p>`);
          run("insertHTML", safe);
          emit();
        }}
      />
    </div>
  );
}
