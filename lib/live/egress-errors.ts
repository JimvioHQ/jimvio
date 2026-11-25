export function normalizeEgressStorageError(error: string | null | undefined): string {
  const raw = typeof error === "string" ? error.trim() : "";
  if (!raw) return "Recording could not be saved because LiveKit Egress failed.";
  if (/InvalidAccessKeyId|Malformed Access Key Id/i.test(raw)) return "Recording storage authentication failed. For Backblaze B2, use a standard S3-compatible Application Key ID and Application Key (not the master key), and confirm the key belongs to the bucket region.";
  if (/SignatureDoesNotMatch|signature validation failed/i.test(raw)) return "Recording storage rejected the signature. Check that the Backblaze Application Key matches its Application Key ID and that the S3 region and endpoint are correct.";
  if (/AccessDenied|Access Denied|Forbidden/i.test(raw)) return "Recording storage denied the upload. Check that the Backblaze application key has writeFiles access to the configured recording bucket.";
  if (/NoSuchBucket|specified bucket does not exist/i.test(raw)) return "Recording storage bucket was not found. Check the bucket name and its Backblaze region endpoint.";
  return raw.slice(0, 500);
}
