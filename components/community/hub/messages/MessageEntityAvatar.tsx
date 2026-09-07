"use client";

import { HubAvatar } from "../hub-ui";

/** Unified avatar for messages: user, space, or community with optional presence. */
export function MessageEntityAvatar({
  name,
  src,
  size = 40,
  online,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <HubAvatar
      name={name}
      src={src}
      size={size}
      online={online}
      className={className}
    />
  );
}

/** Resolve display image from the Space itself. */
export function resolveSpaceAvatar(
  spaceCover: string | null | undefined,
  _communityAvatar?: string | null | undefined
): string | null {
  const cover = spaceCover?.trim();
  return cover || null;
}
