-- Public media bucket used as the upload fallback when Cloudinary rejects
-- an upload. Writes only happen through server-issued signed upload URLs
-- (no client insert policy); files are publicly readable like Cloudinary
-- delivery URLs. Private files never use this bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/quicktime','video/webm','audio/mpeg','audio/mp4','audio/webm','audio/ogg','application/pdf']
)
ON CONFLICT (id) DO NOTHING;
