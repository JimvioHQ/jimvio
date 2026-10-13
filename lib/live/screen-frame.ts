/**
 * Shared-screen frame from the media element's real video dimensions.
 * Orientation follows the stream. Nothing here rotates the picture.
 */

export type VideoFrame = {
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "unknown";
  aspectRatio: number | null;
};

export function describeVideoFrame(width: number, height: number): VideoFrame {
  if (!(width >= 2) || !(height >= 2)) {
    return { width: 0, height: 0, orientation: "unknown", aspectRatio: null };
  }
  const aspectRatio = width / height;
  return {
    width: Math.round(width),
    height: Math.round(height),
    orientation: aspectRatio >= 1 ? "landscape" : "portrait",
    aspectRatio,
  };
}

export function sharedStageLayout(frame: VideoFrame): {
  aspectRatio: string | null;
  maxWidth: string;
  objectFit: "contain";
  rotate: false;
} {
  if (!frame.aspectRatio || frame.orientation === "unknown") {
    return { aspectRatio: null, maxWidth: "100%", objectFit: "contain", rotate: false };
  }
  return {
    aspectRatio: `${frame.width} / ${frame.height}`,
    maxWidth: frame.orientation === "portrait" ? "min(100%, 440px)" : "100%",
    objectFit: "contain",
    rotate: false,
  };
}
