#!/usr/bin/env tsx
/**
 * Migration script to process existing product images with background removal.
 *
 * This script downloads each product image from R2, removes the background
 * using rembg (Python), and re-uploads the transparent image.
 *
 * Prerequisites:
 *   pip install rembg pillow
 *
 * Usage:
 *   npm run migrate:backgrounds
 *   npm run migrate:backgrounds -- --dry-run  # Preview without changes
 *   npm run migrate:backgrounds -- --limit 10 # Process only 10 products
 */

import * as fs from 'fs';
import * as dotenvPath from 'path';

// Load environment variables from .env file
const envFile = dotenvPath.join(__dirname, '..', '.env');
const envFile1 = dotenvPath.join(__dirname, '..', '.env_1');
const envPath = fs.existsSync(envFile) ? envFile : fs.existsSync(envFile1) ? envFile1 : null;

if (envPath) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined;

// R2 configuration
const R2 = new S3Client({
  region: 'auto',
  endpoint: (process.env.R2_ENDPOINT || '').trim(),
  credentials: {
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
  },
});

const BUCKET_NAME = (process.env.R2_BUCKET_NAME || '').trim();
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').trim();

interface MigrationStats {
  productsProcessed: number;
  imagesProcessed: number;
  imagesFailed: number;
  errors: string[];
}

/**
 * Download an image from R2
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const key = url.replace(`${PUBLIC_URL}/`, '');

    const response = await R2.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error(`  Failed to download: ${url}`, error);
    return null;
  }
}

/**
 * Upload an image to R2 (replaces existing)
 */
async function uploadImage(buffer: Buffer, originalUrl: string): Promise<boolean> {
  try {
    // Use same key (replace in place)
    const key = originalUrl.replace(`${PUBLIC_URL}/`, '');

    await R2.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    }));

    return true;
  } catch (error) {
    console.error(`  Failed to upload: ${originalUrl}`, error);
    return false;
  }
}

/**
 * Remove background using Python rembg script
 */
async function removeBackground(imageBuffer: Buffer): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'remove-bg.py');
    // Use venv Python if available, otherwise fallback to system python3
    const venvPython = path.join(__dirname, '..', '.venv', 'bin', 'python3');
    const pythonProcess = spawn(venvPython, [scriptPath]);

    const chunks: Buffer[] = [];
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      chunks.push(data);
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`  Python error: ${errorOutput}`);
        resolve(null);
        return;
      }

      const pngBuffer = Buffer.concat(chunks);
      resolve(pngBuffer);
    });

    pythonProcess.on('error', (error) => {
      console.error(`  Failed to spawn Python: ${error.message}`);
      resolve(null);
    });

    // Send image to Python process
    pythonProcess.stdin.write(imageBuffer);
    pythonProcess.stdin.end();
  });
}

/**
 * Convert PNG to WebP using sharp (optional - for smaller file sizes)
 */
async function convertToWebp(pngBuffer: Buffer): Promise<Buffer> {
  // Dynamic import sharp since it's an ES module
  const sharp = (await import('sharp')).default;
  return sharp(pngBuffer)
    .webp({ quality: 85, alphaQuality: 100 })
    .toBuffer();
}

/**
 * Process a single product's images
 */
async function processProduct(
  product: { id: string; name: string; images: string[] },
  stats: MigrationStats
): Promise<void> {
  console.log(`\nProcessing: ${product.name} (${product.images.length} images)`);

  for (let i = 0; i < product.images.length; i++) {
    const imageUrl = product.images[i];
    console.log(`  Image ${i + 1}/${product.images.length}: ${imageUrl.split('/').pop()}`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would process this image`);
      continue;
    }

    // Download
    const imageBuffer = await downloadImage(imageUrl);
    if (!imageBuffer) {
      stats.imagesFailed++;
      stats.errors.push(`Download failed: ${imageUrl}`);
      continue;
    }
    console.log(`    Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Remove background
    const pngBuffer = await removeBackground(imageBuffer);
    if (!pngBuffer) {
      stats.imagesFailed++;
      stats.errors.push(`Background removal failed: ${imageUrl}`);
      continue;
    }
    console.log(`    Background removed: ${(pngBuffer.length / 1024).toFixed(1)} KB`);

    // Convert to WebP
    const webpBuffer = await convertToWebp(pngBuffer);
    console.log(`    Converted to WebP: ${(webpBuffer.length / 1024).toFixed(1)} KB`);

    // Upload
    const uploaded = await uploadImage(webpBuffer, imageUrl);
    if (!uploaded) {
      stats.imagesFailed++;
      stats.errors.push(`Upload failed: ${imageUrl}`);
      continue;
    }
    console.log(`    Uploaded successfully`);

    stats.imagesProcessed++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  stats.productsProcessed++;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Product Background Removal Migration');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  // Verify R2 configuration
  if (!BUCKET_NAME || !PUBLIC_URL) {
    console.error('Error: R2 environment variables not configured.');
    console.error('Required: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL');
    process.exit(1);
  }

  // Fetch products with images
  const products = await prisma.product.findMany({
    where: {
      images: { isEmpty: false },
    },
    select: {
      id: true,
      name: true,
      images: true,
    },
    take: LIMIT,
    orderBy: { createdAt: 'desc' },
  });

  const totalImages = products.reduce((sum, p) => sum + p.images.length, 0);
  console.log(`\nFound ${products.length} products with ${totalImages} images to process`);

  if (LIMIT) {
    console.log(`(Limited to ${LIMIT} products)`);
  }

  const stats: MigrationStats = {
    productsProcessed: 0,
    imagesProcessed: 0,
    imagesFailed: 0,
    errors: [],
  };

  // Process each product
  for (const product of products) {
    await processProduct(product, stats);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Products processed: ${stats.productsProcessed}/${products.length}`);
  console.log(`Images processed: ${stats.imagesProcessed}`);
  console.log(`Images failed: ${stats.imagesFailed}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.forEach(e => console.log(`  - ${e}`));
  }

  if (DRY_RUN) {
    console.log('\n*** This was a DRY RUN - no changes were made ***');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
