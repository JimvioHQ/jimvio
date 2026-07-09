import { redirect } from "next/navigation";

/** Communities root → Community Feed (default landing) */
export default function CommunitiesPage() {
  redirect("/c");
}
