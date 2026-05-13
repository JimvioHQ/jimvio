import { cn } from "@/lib/utils";

export interface SkeletonBubbleProps {
  own?: boolean;
  wide?: boolean;
}

export function SkeletonBubble({ own, wide }: SkeletonBubbleProps) {
  return (
    <div className={cn("flex w-full mb-3", own ? "justify-end" : "justify-start")}>
      {!own && (
        <div className="h-8 w-8 rounded-sm shrink-0 mr-2 mt-1 animate-pulse bg-[#d1d7db]" />
      )}
      <div
        className={cn(
          "rounded-sm px-3 py-2.5 animate-pulse min-w-[80px] shadow-sm",
          own ? "bg-[#d9fdd3] rounded-tr-sm" : "bg-white rounded-tl-sm",
          wide ? "w-[55%]" : "w-[38%]"
        )}
      >
        <div className="h-3 rounded-sm mb-2 bg-[#d1d7db] w-[70%]" />
        <div className={cn("h-3 rounded-sm mb-2 bg-[#d1d7db]", wide ? "w-[90%]" : "w-1/2")} />
        {wide && <div className="h-3 rounded-sm mb-2 bg-[#d1d7db] w-[40%]" />}
        <div className="flex justify-end mt-2">
          <div className="h-2 w-8 rounded-sm bg-[#d1d7db]" />
        </div>
      </div>
    </div>
  );
}

