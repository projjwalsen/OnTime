/**
 * Represents a single uploaded media file stored in Supabase S3 / Storage.
 */
export interface UploadedMediaFile {
  url: string;
  key: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

/**
 * API response payload for media upload endpoints.
 */
export interface UploadMediaResponse {
  files: UploadedMediaFile[];
  /** Primary URL (first uploaded file) for single-file convenience */
  url: string;
  /** Array of all public URLs */
  urls: string[];
}
