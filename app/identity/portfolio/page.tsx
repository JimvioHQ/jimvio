import { redirect } from "next/navigation";

export default function IdentityPortfolioRedirect() {
  redirect("/settings/profile");
}
