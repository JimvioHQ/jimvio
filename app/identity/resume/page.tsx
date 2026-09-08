import { redirect } from "next/navigation";

export default function IdentityResumeRedirect() {
  redirect("/identity/edit");
}
