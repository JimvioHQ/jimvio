import { cn, formatDuration } from "@/lib/utils";
import { Pause, Play, Mic } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface WaAudioPlayerProps {
  src: string;
  isOwn?: boolean;
}

export function WaAudioPlayer({ src, isOwn }: WaAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(isFinite(a.duration) ? a.duration : 0);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else a.play().then(() => setPlaying(true)).catch(console.error);
  }

  const pct = duration > 0 ? Math.min((current / duration) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px] max-w-[270px]">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause audio" : "Play audio"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>
      <div className="flex flex-col flex-1 min-w-0 gap-1.5">
        <div
          className={cn(
            "relative h-1.5 rounded-full overflow-hidden cursor-pointer",
            isOwn ? "bg-[#b2dfcd]" : "bg-[#d1d7db]"
          )}
          onClick={(e) => {
            const a = audioRef.current;
            if (!a || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#00a884] transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tabular-nums text-[#667781]">
            {playing || current > 0 ? formatDuration(current) : formatDuration(duration)}
          </span>
          <Mic className="h-3 w-3 text-[#667781]" />
        </div>
      </div>
    </div>
  );
}