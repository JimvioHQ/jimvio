interface EyebrowProps {
    children: React.ReactNode;
}

export default function Eyebrow({ children }: EyebrowProps) {
    return (
        <p
            style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 20,
            }}
        >
            {children}
        </p>
    );
}