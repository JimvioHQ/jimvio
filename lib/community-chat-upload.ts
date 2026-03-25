import { createClient } from "@/lib/supabase/client";

const BUCKET = "chat-files";

export type ChatAttachmentPayload = {
  url: string;
  name: string;
  mime: string;
  size: number;
};

/** Upload a file for community chat; uses same bucket as DM chat (see messaging migration notes). */
export async function uploadCommunityChatFile(communityId: string, roomId: string, file: File): Promise<ChatAttachmentPayload> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "bin";
  const base = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
  const path = `community/${communityId}/${roomId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${base}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return {
    url: urlData.publicUrl,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
  };
}
