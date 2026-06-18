"use client";

import { DEFAULT_PROFILE_IMAGE, resolveProfileImage } from "@/lib/profile-image";
import { cn } from "@/lib/utils";

type ProfileImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src?: string | null;
};

export function ProfileImage({ src, alt = "Profile", className, onError, ...rest }: ProfileImageProps) {
  return (
    <img
      src={resolveProfileImage(src)}
      alt={alt}
      className={cn("object-cover", className)}
      onError={(e) => {
        e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
        onError?.(e);
      }}
      {...rest}
    />
  );
}
