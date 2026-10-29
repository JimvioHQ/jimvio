"use client";

import { useParams } from "next/navigation";
import { ManageCommunitySectionView } from "@/components/community/owner-console/ManageCommunitySectionView";

export default function ManageCommunitySectionPage() {
  const params = useParams();
  const raw = params.section;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return <ManageCommunitySectionView sectionPath={segments.join("/")} />;
}
