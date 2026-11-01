import { redirect } from "next/navigation";

export default function LegacyInfluencersBrowsePage(): never {
  redirect("/users/browse");
}
