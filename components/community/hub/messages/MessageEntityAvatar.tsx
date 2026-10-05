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

/** Resolve Space image: Space cover → community logo → null. */
export function resolveSpaceAvatar(
  spaceCover: string | null | undefined,
  communityAvatar?: string | null | undefined,
  communityCover?: string | null | undefined
): string | null {
  const cover = spaceCover?.trim();
  if (cover) return cover;
  const logo = communityAvatar?.trim();
  if (logo) return logo;
  const communityHero = communityCover?.trim();
  return communityHero || null;
}
