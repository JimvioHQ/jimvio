import React, { CSSProperties, ReactNode } from "react";

type Orientation = "portrait" | "landscape";
type WallpaperFit = "cover" | "contain" | "fill";

export interface AndroidMockupProps {
  color?: "black" | "midnight" | "graphite" | "silver" | string;
  orientation?: Orientation;
  scale?: number;
  bezel?: number;
  radius?: number;
  shadow?: boolean | string;
  screenBg?: string;
  wallpaper?: string;
  wallpaperFit?: WallpaperFit;
  wallpaperPosition?: string;
  showPunchHole?: boolean;
  punchHoleSize?: number;
  safeArea?: boolean;
  safeAreaOverrides?: Partial<{ top: number; bottom: number; left: number; right: number }>;
  showNavBar?: boolean;
  innerShadow?: boolean;
  style?: CSSProperties;
  className?: string;
  frameStyle?: CSSProperties;
  screenStyle?: CSSProperties;
  children?: ReactNode;
}

const DEVICE = {
  w: 360,
  h: 780,
  radius: 42,
  bezel: 10,
  topSafe: 34,
  bottomSafe: 22,
  punchHole: 11,
};

const PRESET_COLORS: Record<string, string> = {
  black: "#121214",
  midnight: "#0f1012",
  graphite: "#2b2b2f",
  silver: "#d9d9de",
};

function shade(hex: string, pct: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  const k = (100 + pct) / 100;
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${to(r).toString(16).padStart(2, "0")}${to(g).toString(16).padStart(2, "0")}${to(b).toString(16).padStart(2, "0")}`;
}

/** Android phone mockup — punch-hole, rounded bezel */
export const AndroidMockup: React.FC<AndroidMockupProps> = ({
  color = "graphite",
  orientation = "portrait",
  scale = 1,
  bezel,
  radius,
  shadow = true,
  screenBg = "#000",
  wallpaper,
  wallpaperFit = "cover",
  wallpaperPosition = "center",
  showPunchHole = true,
  punchHoleSize,
  safeArea = true,
  safeAreaOverrides,
  showNavBar = true,
  innerShadow = true,
  style,
  className,
  frameStyle,
  screenStyle,
  children,
}) => {
  const resolvedRadius = radius ?? DEVICE.radius;
  const resolvedBezel = bezel ?? DEVICE.bezel;
  const isLandscape = orientation === "landscape";
  const screenWidth = isLandscape ? DEVICE.h : DEVICE.w;
  const screenHeight = isLandscape ? DEVICE.w : DEVICE.h;
  const outerWidth = screenWidth + resolvedBezel * 2;
  const outerHeight = screenHeight + resolvedBezel * 2;
  const outerRadius = resolvedRadius + resolvedBezel;
  const holeSize = punchHoleSize ?? DEVICE.punchHole;

  const colorHex = PRESET_COLORS[color] ?? color;
  const frameGradient = `linear-gradient(145deg, ${shade(colorHex, 10)} 0%, ${colorHex} 45%, ${shade(colorHex, -16)} 100%)`;
  const outerShadow = typeof shadow === "string"
    ? shadow
    : shadow
      ? "0 14px 32px rgba(0,0,0,0.38), 0 3px 8px rgba(0,0,0,0.24)"
      : "none";
  const innerShadowCss = innerShadow
    ? "inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 8px 18px rgba(0,0,0,0.32)"
    : "none";

  const insets = {
    top: safeAreaOverrides?.top ?? DEVICE.topSafe,
    bottom: safeAreaOverrides?.bottom ?? DEVICE.bottomSafe,
    left: safeAreaOverrides?.left ?? 0,
    right: safeAreaOverrides?.right ?? 0,
  };

  const wrapperStyle: CSSProperties = {
    boxSizing: "border-box",
    display: "inline-block",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    ...style,
  };

  const frameBoxStyle: CSSProperties = {
    width: outerWidth,
    height: outerHeight,
    borderRadius: outerRadius,
    background: frameGradient,
    padding: resolvedBezel,
    boxSizing: "border-box",
    boxShadow: outerShadow,
    position: "relative",
    overflow: "hidden",
    ...frameStyle,
  };

  const screenBoxStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: resolvedRadius,
    position: "relative",
    overflow: "hidden",
    background: screenBg,
    boxShadow: innerShadowCss,
    ...screenStyle,
  };

  const wallpaperStyle: CSSProperties | undefined = wallpaper
    ? {
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: wallpaperFit,
        backgroundPosition: wallpaperPosition,
        backgroundRepeat: "no-repeat",
        zIndex: 0,
      }
    : undefined;

  const contentStyle: CSSProperties = safeArea
    ? {
        position: "absolute",
        top: insets.top,
        right: insets.right,
        bottom: insets.bottom,
        left: insets.left,
        overflow: "hidden",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
      }
    : {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
      };

  return (
    <div className={className} style={wrapperStyle}>
      <div style={frameBoxStyle} aria-label="Android phone mockup">
        <div style={screenBoxStyle}>
          {wallpaper && <div aria-hidden style={wallpaperStyle} />}

          {showPunchHole && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                width: holeSize,
                height: holeSize,
                borderRadius: "50%",
                background: "#000",
                zIndex: 2,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            />
          )}

          <div style={contentStyle}>{children}</div>

          {showNavBar && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                bottom: 6,
                left: "50%",
                transform: "translateX(-50%)",
                width: Math.round(screenWidth * 0.36),
                maxWidth: 120,
                height: 4,
                borderRadius: 4,
                background: "rgba(255,255,255,0.55)",
                zIndex: 3,
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AndroidMockup;
