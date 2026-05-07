import type { TableRow } from "@/types";

// ─── Eyebrow ──────────────────────────────────────────────────────────────────

export function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 20,
        }}>
            {children}
        </p>
    );
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

export function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            color: "var(--text)",
            marginBottom: 20,
        }}>
            {children}
        </h2>
    );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
    return (
        <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
            marginTop: 20,
        }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {headers.map((h) => (
                            <th key={h} style={{
                                textAlign: "left",
                                padding: "10px 16px",
                                fontFamily: "'Syne', sans-serif",
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: "var(--text3)",
                            }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <td style={{ padding: "14px 16px", color: "var(--text)", fontWeight: 500, lineHeight: 1.55 }}>{row.col1}</td>
                            <td style={{ padding: "14px 16px", color: "var(--text2)", fontWeight: 300, lineHeight: 1.55 }}>{row.col2}</td>
                            <td style={{ padding: "14px 16px", color: "var(--text2)", fontWeight: 300, lineHeight: 1.55 }}>{row.col3}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── LegalList ────────────────────────────────────────────────────────────────

type ListVariant = "dash" | "check" | "cross";

export function LegalList({ items, variant = "dash" }: { items: string[]; variant?: ListVariant }) {
    const symbols: Record<ListVariant, { char: string; color: string }> = {
        dash: { char: "—", color: "var(--accent)" },
        check: { char: "✓", color: "#4ade80" },
        cross: { char: "✗", color: "#f87171" },
    };
    const { char, color } = symbols[variant];
    return (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {items.map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "var(--text2)", lineHeight: 1.6, fontWeight: 300 }}>
                    <span style={{ color, flexShrink: 0, marginTop: 1 }}>{char}</span>
                    {item}
                </li>
            ))}
        </ul>
    );
}

// ─── HighlightBox ─────────────────────────────────────────────────────────────

export function HighlightBox({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            background: "rgba(253,80,0,0.07)",
            border: "1px solid rgba(253,80,0,0.18)",
            borderRadius: 12,
            padding: "20px 24px",
            marginTop: 20,
            fontSize: 14,
            color: "rgba(253,130,70,0.9)",
            lineHeight: 1.7,
            fontWeight: 300,
        }}>
            {children}
        </div>
    );
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────

export function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 56 }}>
            <h3 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: "1px solid var(--border)",
            }}>
                {title}
            </h3>
            {children}
        </div>
    );
}

// ─── LegalMeta ───────────────────────────────────────────────────────────────

export function LegalMeta({ tags }: { tags: Array<{ label: string; green?: boolean }> }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {tags.map((tag) => (
                <span key={tag.label} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: tag.green ? "rgba(74,222,128,0.06)" : "var(--surface2)",
                    border: `1px solid ${tag.green ? "rgba(74,222,128,0.2)" : "var(--border)"}`,
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 12,
                    color: tag.green ? "#4ade80" : "var(--text2)",
                    fontWeight: 500,
                }}>
                    {tag.label}
                </span>
            ))}
        </div>
    );
}

// ─── LegalHero ───────────────────────────────────────────────────────────────

export function LegalHero({
    eyebrow,
    titleLine1,
    titleLine2,
    tags,
}: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    tags: Array<{ label: string; green?: boolean }>;
}) {
    return (
        <div style={{ paddingBottom: 60, borderBottom: "1px solid var(--border)", marginBottom: 60 }}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(34px, 5vw, 56px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.0,
                color: "var(--text)",
                marginBottom: 24,
            }}>
                {titleLine1}
                <br />
                <span style={{ color: "var(--accent)" }}>{titleLine2}</span>
            </h1>
            <LegalMeta tags={tags} />
        </div>
    );
}