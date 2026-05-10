import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { GlobeCanvas } from "@/components/layout/hero";

export default function LiveActivity() {
    return (
        <div style={{
            display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", justifyContent: "center", height: "100vh"
        }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                <div style={{ padding: "10px", background: "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(124,58,237,0.15) 100%)", borderRadius: "12px" }}>
                    <Sparkles style={{ color: "var(--color-accent)", fontSize: "24px" }} />
                </div>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "8px" }}>
                        Live activities
                    </h1>
                    <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", maxWidth: "420px", margin: "0 auto" }}>
                        Your real-time feed of sales, followers, and everything happening across Jimvio.
                    </p>
                </div>
            </div>
            <GlobeCanvas />
            <div style={{ display: "flex", gap: "12px" }}>
                <Link href="/dashboard" style={{ textDecoration: "none" }}>
                    <button style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 600, borderRadius: "10px", border: "none", cursor: "pointer", color: "#fff", background: "var(--color-accent)" }}>
                        <ArrowRight style={{ marginRight: "4px" }} />
                        Go to Dashboard
                    </button>
                </Link>
                <Link href="/activities" style={{ textDecoration: "none" }}>
                    <button style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 600, borderRadius: "10px", border: "none", cursor: "pointer", background: "var(--color-surface-secondary)", color: "var(--color-text-primary)" }}>
                        Back to activity
                    </button>
                </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px" }}>
                <CheckCircle2 style={{ color: "var(--color-success)", fontSize: "16px" }} />
                <span style={{ fontSize: "13px", color: "var(--color-success)" }}>
                    All caught up
                </span>
            </div>
        </div>
    )
}