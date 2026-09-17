import crypto from 'crypto';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type UploadedMediaFile, type UploadMediaResponse } from '@ontime/shared';
import { config } from '../config/env';

export class StorageError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageService {
  private supabase: SupabaseClient | null = null;
  private bucket: string;

  constructor() {
    this.bucket = config.supabaseBucket || 'product-images';
    if (config.supabaseUrl && config.supabaseKey) {
      try {
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
      } catch (err) {
        console.warn('[StorageService] Failed to initialize Supabase client:', err);
      }
    }
  }

  /**
   * Determine file extension safely from mimetype and original filename.
   */
  private getExtension(originalname: string, mimetype: string): string {
    const extFromFilename = path.extname(originalname).replace('.', '').toLowerCase();
    if (extFromFilename && /^[a-z0-9]+$/i.test(extFromFilename)) {
      return extFromFilename;
    }

    switch (mimetype.toLowerCase()) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      case 'image/svg+xml':
        return 'svg';
      default:
        return 'png';
    }
  }

  /**
   * Upload a single buffer to Supabase Storage.
   */
  async uploadFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }): Promise<UploadedMediaFile> {
    const ext = this.getExtension(file.originalname, file.mimetype);
    const datePrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
    const uniqueId = crypto.randomUUID();
    const cleanFilename = `${Date.now()}-${uniqueId}.${ext}`;
    const fileKey = `products/${datePrefix}/${cleanFilename}`;

    let publicUrl = `${config.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${this.bucket}/${fileKey}`;

    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileKey, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
          cacheControl: '31536000',
        });

      if (error) {
        console.error('[StorageService] Supabase upload error:', error);
        // If the bucket doesn't exist, attempt to provide the public URL format or throw helpful error
        if (error.message && !error.message.includes('Bucket not found')) {
          throw new StorageError(`Failed to upload image: ${error.message}`, 502);
        }
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(fileKey);

      if (urlData?.publicUrl) {
        publicUrl = urlData.publicUrl;
      }
    }

    return {
      url: publicUrl,
      key: fileKey,
      filename: cleanFilename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Upload multiple files to Supabase Storage concurrently.
   */
  async uploadFiles(
    files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
  ): Promise<UploadMediaResponse> {
    if (!files || files.length === 0) {
      throw new StorageError('No files were provided for upload', 400);
    }

    const uploaded = await Promise.all(files.map((f) => this.uploadFile(f)));
    const urls = uploaded.map((u) => u.url);

    return {
      files: uploaded,
      url: urls[0] || '',
      urls,
    };
  }
}

export const storageService = new StorageService();
