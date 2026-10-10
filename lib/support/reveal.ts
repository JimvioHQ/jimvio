/** Split an assistant reply into short readable pieces for client-side reveal. */
export function assistantRevealChunks(text: string, reducedMotion: boolean) {
  if (reducedMotion || text.length <= 48) return [text];
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  const chunks: string[] = [];
  let bucket = "";
  let words = 0;
  for (const part of parts) {
    bucket += part;
    if (!/^\s+$/.test(part)) words += 1;
    if (words >= 3 || bucket.length >= 42) {
      chunks.push(bucket);
      bucket = "";
      words = 0;
    }
  }
  if (bucket) chunks.push(bucket);
  return chunks.length > 0 ? chunks : [text];
}

/** Milliseconds between chunks. Long answers accelerate so the wait stays under about two seconds. */
export function revealDelayMs(chunkCount: number, reducedMotion: boolean) {
  if (reducedMotion || chunkCount <= 1) return 0;
  return Math.max(18, Math.min(40, Math.floor(2000 / chunkCount)));
}
