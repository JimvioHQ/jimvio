/**
 * Close unfinished Markdown so a partial stream cannot break the layout.
 * The final message uses the unmodified text.
 */
export function stabilizeStreamingMarkdown(text: string): string {
  let out = text.replace(/\u0000/g, "");
  const fences = out.match(/```/g)?.length ?? 0;
  if (fences % 2 === 1) out += "\n```";

  const bold = out.match(/\*\*/g)?.length ?? 0;
  if (bold % 2 === 1) out += "**";

  const ticks = out.replace(/```/g, "").match(/`/g)?.length ?? 0;
  if (ticks % 2 === 1) out += "`";

  return out;
}
