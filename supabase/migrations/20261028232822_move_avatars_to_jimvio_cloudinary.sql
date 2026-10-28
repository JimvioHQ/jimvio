-- R-10: one Cloudinary account. The last 5 profile photos on the old
-- 'devgclwyi' account were copied to 'jimvio' (same public ids); links are
-- updated. Previous values archived.
CREATE TABLE IF NOT EXISTS catalog_archive.avatars_devgclwyi_20261029 AS
SELECT id, avatar_url FROM public.profiles WHERE avatar_url LIKE '%res.cloudinary.com/devgclwyi/%';

UPDATE public.profiles p SET avatar_url = v.new_url
FROM (VALUES
  ('https://res.cloudinary.com/devgclwyi/image/upload/v1775867798/jimvio/avatars/ez0pxohkftszojk7awls.jpg','https://res.cloudinary.com/jimvio/image/upload/v1793230087/jimvio/avatars/ez0pxohkftszojk7awls.jpg'),
  ('https://res.cloudinary.com/devgclwyi/image/upload/v1775749640/jimvio/avatars/vqshvd2zojy5lk13tkdw.jpg','https://res.cloudinary.com/jimvio/image/upload/v1793230088/jimvio/avatars/vqshvd2zojy5lk13tkdw.jpg'),
  ('https://res.cloudinary.com/devgclwyi/image/upload/v1776800423/jimvio/avatars/ensgwn3wwqomgh6ceqkg.png','https://res.cloudinary.com/jimvio/image/upload/v1793230089/jimvio/avatars/ensgwn3wwqomgh6ceqkg.png'),
  ('https://res.cloudinary.com/devgclwyi/image/upload/v1775380803/jimvio/avatars/fp0rycwjd48xsakopbn5.jpg','https://res.cloudinary.com/jimvio/image/upload/v1793230091/jimvio/avatars/fp0rycwjd48xsakopbn5.jpg'),
  ('https://res.cloudinary.com/devgclwyi/image/upload/v1775750592/jimvio/avatars/biww5xiixu3uanwlhtdi.jpg','https://res.cloudinary.com/jimvio/image/upload/v1793230092/jimvio/avatars/biww5xiixu3uanwlhtdi.jpg')
) AS v(old_url, new_url)
WHERE p.avatar_url = v.old_url;
