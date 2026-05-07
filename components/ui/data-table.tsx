import type { TableRow } from "@/types";

interface DataTableProps {
    headers: [string, string, string];
    rows: TableRow[];
}

export default function DataTable({ headers, rows }: DataTableProps) {
    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
                marginTop: 20,
            }}
        >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {headers.map((h) => (
                            <th
                                key={h}
                                style={{
                                    textAlign: "left",
                                    padding: "10px 16px",
                                    fontFamily: "'Syne', sans-serif",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    color: "var(--text3)",
                                }}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={i}
                            style={{
                                borderBottom:
                                    i < rows.length - 1
                                        ? "1px solid rgba(255,255,255,0.04)"
                                        : "none",
                            }}
                        >
                            <td style={{ padding: "14px 16px", color: "var(--text)", fontWeight: 500, lineHeight: 1.55 }}>
                                {row.col1}
                            </td>
                            <td style={{ padding: "14px 16px", color: "var(--text2)", fontWeight: 300, lineHeight: 1.55 }}>
                                {row.col2}
                            </td>
                            <td style={{ padding: "14px 16px", color: "var(--text2)", fontWeight: 300, lineHeight: 1.55 }}>
                                {row.col3}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}