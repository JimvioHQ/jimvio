interface HighlightBoxProps {
    children: React.ReactNode;
}

export default function HighlightBox({ children }: HighlightBoxProps) {
    return (
        <div
            style={{
                background: "rgba(253,80,0,0.07)",
                border: "1px solid rgba(253,80,0,0.18)",
                borderRadius: 12,
                padding: "20px 24px",
                marginTop: 20,
                fontSize: 14,
                color: "rgba(253,130,70,0.9)",
                lineHeight: 1.7,
                fontWeight: 300,
            }}
        >
            {children}
        </div>
    );
}