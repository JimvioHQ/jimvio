/**
 * Barrel for editorial licensed photo content seeding.
 */
export {
  PHOTO_CONTENT_KEY_PREFIX,
  photoContentKey,
  parsePhotoContentKey,
} from "./types";
export type {
  PhotoSourceProvider,
  LicensedPhotoSpec,
  PhotoMediaProvenance,
  CommunityPhotoTarget,
  CaptionKind,
} from "./types";
export {
  normalizeUnsplashPhotoId,
  unsplashDownloadUrl,
  unsplashAttributionUrl,
  licensedUnsplashPhoto,
  searchUnsplashPhotos,
} from "./unsplash";
export {
  CATEGORY_PHOTO_CATALOG,
  photosForCommunity,
  listCatalogCategories,
  catalogStats,
} from "./catalog";
export { captionKinds, buildPhotoCaption } from "./captions";
export { selectPhotosForCommunity } from "./select-photos";
export { downloadAndValidateImage } from "./validate-image";
export type { ValidatedImage } from "./validate-image";
export {
  editorialPhotoPublicId,
  hasCloudinaryCredentials,
  uploadValidatedImageToCloudinary,
  uploadValidatedImageToCloudinaryDirect,
  buildMediaProvenance,
} from "./upload-cloudinary";
export type { CloudinaryPhotoUpload } from "./upload-cloudinary";
