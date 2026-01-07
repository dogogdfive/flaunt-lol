// lib/remove-background.ts
// Client-side background removal using @imgly/background-removal
// Runs entirely in the browser - no server-side processing

import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

export interface RemoveBackgroundResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Remove background from an image file
 * Runs in the browser using WebAssembly/ONNX
 *
 * @param file - The image file to process
 * @param onProgress - Optional progress callback (0-1)
 * @returns Blob with transparent background (PNG format)
 */
export async function removeBackground(
  file: File,
  onProgress?: (progress: number) => void
): Promise<RemoveBackgroundResult> {
  try {
    const blob = await imglyRemoveBackground(file, {
      model: 'isnet_quint8', // Quantized model - good balance of speed and quality
      output: {
        format: 'image/png',
        quality: 0.9,
      },
      progress: onProgress ? (key, current, total) => {
        if (total > 0) {
          onProgress(current / total);
        }
      } : undefined,
    });

    return { success: true, blob };
  } catch (error) {
    console.error('[Background Removal] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove background',
    };
  }
}

/**
 * Convert a Blob to a File object
 */
export function blobToFile(blob: Blob, originalFileName: string): File {
  // Change extension to .png since output is PNG
  const baseName = originalFileName.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.png`, { type: 'image/png' });
}
