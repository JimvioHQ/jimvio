import { SkeletonBubble, SkeletonBubbleProps } from "./SkeletonBubble";

export function ChatSkeleton() {
  const pattern: SkeletonBubbleProps[] = [
    { own: false, wide: false },
    { own: false, wide: true },
    { own: true, wide: false },
    { own: true, wide: true },
    { own: false, wide: true },
    { own: true, wide: false },
    { own: false, wide: false },
    { own: false, wide: true },
    { own: true, wide: true },
    { own: true, wide: false },
    { own: false, wide: false },
    { own: true, wide: true },
  ];
  return (
    <div className="flex flex-col px-[5%] pt-6">
      {pattern.map((p, i) => (
        <SkeletonBubble key={i} own={p.own} wide={p.wide} />
      ))}
    </div>
  );
}