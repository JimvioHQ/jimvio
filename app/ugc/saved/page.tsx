import { redirect } from "next/navigation";

/** Legacy UGC-only saved → canonical global Saved Items. */
export default function UgcSavedRedirectPage() {
  redirect("/saved");
}
