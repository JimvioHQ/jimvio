import { redirect } from "next/navigation";

/** Legacy footer link — Trust & Safety maps to Community Guidelines. */
export default function SafetyRedirectPage() {
  redirect("/community-guidelines");
}
