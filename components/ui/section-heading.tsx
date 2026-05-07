interface SectionHeadingProps {
    children: React.ReactNode;
}

export default function SectionHeading({ children }: SectionHeadingProps) {
    return (
        <h2
            style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                color: "var(--text)",
                marginBottom: 20,
            }}
        >
            {children}
        </h2>
    );
}