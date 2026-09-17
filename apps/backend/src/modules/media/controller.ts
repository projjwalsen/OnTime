import type { Request, Response } from 'express';
import { storageService, StorageError } from '../../lib/storage.service';
import { successResponse, errorResponse } from '../../utils/response';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per image

export class MediaController {
  /**
   * Upload single or multiple images to Supabase S3 / Storage bucket.
   * Only accessible to SUPER_ADMIN.
   */
  async uploadImages(req: Request, res: Response): Promise<void> {
    try {
      // Gather files from multer: support req.files (array or fields) and req.file (single)
      let filesToUpload: Express.Multer.File[] = [];

      if (req.files) {
        if (Array.isArray(req.files)) {
          filesToUpload = req.files;
        } else {
          // req.files is a dictionary of fields
          for (const field of Object.values(req.files)) {
            filesToUpload.push(...field);
          }
        }
      } else if (req.file) {
        filesToUpload = [req.file];
      }

      if (filesToUpload.length === 0) {
        errorResponse(res, 'No image file uploaded. Please include at least one image file.', 400);
        return;
      }

      // Validate MIME types and file sizes
      for (const file of filesToUpload) {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
          errorResponse(
            res,
            `Unsupported file type "${file.mimetype}". Allowed types: JPEG, PNG, WebP, GIF, SVG.`,
            400,
          );
          return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          errorResponse(
            res,
            `File "${file.originalname}" exceeds maximum allowed size of 10 MB.`,
            400,
          );
          return;
        }
      }

      const result = await storageService.uploadFiles(
        filesToUpload.map((f) => ({
          buffer: f.buffer,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
        })),
      );

      successResponse(res, 'Image(s) uploaded successfully', result, 201);
    } catch (err: unknown) {
      if (err instanceof StorageError) {
        errorResponse(res, err.message, err.statusCode);
        return;
      }
      const message = err instanceof Error ? err.message : 'An error occurred during file upload';
      errorResponse(res, message, 500);
    }
  }
}

export const mediaController = new MediaController();
