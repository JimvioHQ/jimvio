/**
 * Server-side Cloudinary account name used for signing and uploading.
 *
 * CLOUDINARY_CLOUD_NAME is set together with CLOUDINARY_API_KEY /
 * CLOUDINARY_API_SECRET, so it always names the account that key belongs to.
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is only a fallback: if it points at an
 * older account, a signed upload is rejected by Cloudinary with
 * "Request forbidden due to missing permissions".
 */
export function serverCloudinaryCloudName(): string {
  return (
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    ""
  );
}
