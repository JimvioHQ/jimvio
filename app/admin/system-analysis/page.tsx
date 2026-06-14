import React from "react";
import { getSystemAnalysisData } from "@/services/admin/getSystemAnalysis";
import { SystemAnalysisClient } from "@/components/admin/system-analysis-client";

export const dynamic = "force-dynamic";

export default async function AdminSystemAnalysisPage() {
    const data = await getSystemAnalysisData();
    return <SystemAnalysisClient data={data} />;
}
