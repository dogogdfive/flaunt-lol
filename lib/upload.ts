// lib/upload.ts
// Cloudflare R2 image upload utility with image optimization

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// R2 client configuration - trim credentials to avoid whitespace issues
const R2 = new S3Client({
  region: 'auto',
  endpoint: (process.env.R2_ENDPOINT || '').trim(),
  credentials: {
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
  },
});

const BUCKET_NAME = (process.env.R2_BUCKET_NAME || '').trim();
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').trim(); // Your custom domain or R2.dev URL

// Image size requirements
export const IMAGE_REQUIREMENTS = {
  storeBanner: {
    width: 1200,
    height: 400,
    maxSize: 5 * 1024 * 1024, // 5MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  productImage: {
    width: 800,
    height: 800,
    maxSize: 5 * 1024 * 1024, // 5MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  storeLogo: {
    width: 200,
    height: 200,
    maxSize: 2 * 1024 * 1024, // 2MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  categoryImage: {
    width: 400,
    height: 400,
    maxSize: 2 * 1024 * 1024, // 2MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  avatar: {
    width: 256,
    height: 256,
    maxSize: 2 * 1024 * 1024, // 2MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  reviewImage: {
    width: 800,
    height: 800,
    maxSize: 5 * 1024 * 1024, // 5MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  auctionImage: {
    width: 800,
    height: 800,
    maxSize: 5 * 1024 * 1024, // 5MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

type ImageType = keyof typeof IMAGE_REQUIREMENTS;

interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

/**
 * Process and optimize an image - resize and compress
 */
export async function processImage(
  buffer: Buffer,
  type: ImageType
): Promise<ProcessedImage> {
  const requirements = IMAGE_REQUIREMENTS[type];

  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  console.log('[Image Processing] Original:', {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length
  });

  // Determine if resize is needed
  const needsResize =
    (metadata.width && metadata.width > requirements.width) ||
    (metadata.height && metadata.height > requirements.height);

  let processedBuffer: Buffer;

  // Process the image - resize if needed and convert to WebP for optimal size
  const sharpInstance = sharp(buffer);

  if (needsResize) {
    sharpInstance.resize(requirements.width, requirements.height, {
      fit: 'cover',
      position: 'center',
      withoutEnlargement: true,
    });
  }

  // Convert to WebP with quality optimization (smaller files, good quality)
  processedBuffer = await sharpInstance
    .webp({ quality: 80 })
    .toBuffer();

  // Get final dimensions
  const finalMetadata = await sharp(processedBuffer).metadata();

  console.log('[Image Processing] Optimized:', {
    width: finalMetadata.width,
    height: finalMetadata.height,
    format: 'webp',
    originalSize: buffer.length,
    newSize: processedBuffer.length,
    reduction: `${Math.round((1 - processedBuffer.length / buffer.length) * 100)}%`
  });

  return {
    buffer: processedBuffer,
    contentType: 'image/webp',
    width: finalMetadata.width || requirements.width,
    height: finalMetadata.height || requirements.height,
  };
}

/**
 * Generate a presigned URL for direct browser upload
 */
export async function getPresignedUploadUrl(
  type: ImageType,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string } | null> {
  const requirements = IMAGE_REQUIREMENTS[type];
  
  if (!requirements.formats.includes(contentType)) {
    return null;
  }

  const extension = filename.split('.').pop() || 'jpg';
  const key = `${type}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, key, publicUrl };
}

/**
 * Upload image directly from server (Buffer)
 */
export async function uploadImage(
  type: ImageType,
  buffer: Buffer,
  contentType: string,
  filename: string
): Promise<UploadResult> {
  try {
    console.log('[R2 Upload] Starting upload:', { type, filename, contentType, bufferSize: buffer.length });
    console.log('[R2 Upload] Config:', {
      bucket: BUCKET_NAME,
      publicUrl: PUBLIC_URL,
      hasEndpoint: !!process.env.R2_ENDPOINT,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
    });

    const requirements = IMAGE_REQUIREMENTS[type];

    // Validate content type
    if (!requirements.formats.includes(contentType)) {
      return {
        success: false,
        error: `Invalid format. Allowed: ${requirements.formats.join(', ')}`,
      };
    }

    // Validate file size
    if (buffer.length > requirements.maxSize) {
      return {
        success: false,
        error: `File too large. Max size: ${requirements.maxSize / 1024 / 1024}MB`,
      };
    }

    const extension = filename.split('.').pop() || 'jpg';
    const key = `${type}/${uuidv4()}.${extension}`;

    console.log('[R2 Upload] Uploading to key:', key);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await R2.send(command);
    console.log('[R2 Upload] Upload successful');

    return {
      success: true,
      url: `${PUBLIC_URL}/${key}`,
      key,
    };
  } catch (error) {
    console.error('[R2 Upload] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `R2 upload failed: ${errorMessage}`,
    };
  }
}

/**
 * Delete an image from R2
 */
export async function deleteImage(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await R2.send(command);
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

/**
 * Extract key from full URL
 */
export function getKeyFromUrl(url: string): string | null {
  if (!url.startsWith(PUBLIC_URL)) return null;
  return url.replace(`${PUBLIC_URL}/`, '');
}

/**
 * Validate image dimensions (client-side helper info)
 */
export function getImageRequirements(type: ImageType) {
  return IMAGE_REQUIREMENTS[type];
}
