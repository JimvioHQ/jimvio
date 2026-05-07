interface SectionBlockProps {
  title: string;
  children: React.ReactNode;
}

export default function SectionBlock({ title, children }: SectionBlockProps) {
  return (
    <div style={{ marginBottom: 56 }}>
      <h3
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: "var(--text)",
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}