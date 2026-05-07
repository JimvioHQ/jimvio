type Variant = "dash" | "check" | "cross";

interface LegalListProps {
    items: string[];
    variant?: Variant;
}

const SYMBOLS: Record<Variant, { char: string; color: string }> = {
    dash: { char: "—", color: "var(--accent)" },
    check: { char: "✓", color: "#4ade80" },
    cross: { char: "✗", color: "#f87171" },
};

export default function LegalList({ items, variant = "dash" }: LegalListProps) {
    const { char, color } = SYMBOLS[variant];

    return (
        <ul
            style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
            }}
        >
            {items.map((item, i) => (
                <li
                    key={i}
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        fontSize: 15,
                        color: "var(--text2)",
                        lineHeight: 1.6,
                        fontWeight: 300,
                    }}
                >
                    <span style={{ color, flexShrink: 0, marginTop: 1 }}>{char}</span>
                    {item}
                </li>
            ))}
        </ul>
    );
}