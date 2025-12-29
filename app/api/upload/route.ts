// app/api/upload/route.ts
// Image upload API endpoint with automatic optimization

import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, processImage, IMAGE_REQUIREMENTS } from '@/lib/upload';

// Handle CORS preflight for custom headers
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-wallet-address',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    // Check for wallet address in form data or header
    const walletAddress = formData.get('walletAddress') as string | null || request.headers.get('x-wallet-address');

    console.log('[Upload API] Wallet address:', walletAddress);

    if (!walletAddress) {
      console.log('[Upload API] No wallet address provided');
      return NextResponse.json(
        { error: 'Please connect your wallet to upload' },
        { status: 401 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || !['storeBanner', 'productImage', 'storeLogo', 'categoryImage', 'avatar', 'reviewImage'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      );
    }

    const imageType = type as keyof typeof IMAGE_REQUIREMENTS;
    const requirements = IMAGE_REQUIREMENTS[imageType];

    // Validate content type
    if (!requirements.formats.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid format. Allowed: ${requirements.formats.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > requirements.maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${requirements.maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('[Upload API] Processing file:', { type: imageType, size: file.size, contentType: file.type });

    // Process image - resize and compress to WebP
    const processed = await processImage(buffer, imageType);
    console.log('[Upload API] Image optimized:', {
      originalSize: file.size,
      optimizedSize: processed.buffer.length,
      reduction: `${Math.round((1 - processed.buffer.length / file.size) * 100)}%`
    });

    // Upload optimized image to R2
    const result = await uploadImage(
      imageType,
      processed.buffer,
      processed.contentType,
      file.name.replace(/\.[^.]+$/, '.webp')
    );

    console.log('[Upload API] Upload result:', result);

    if (!result.success) {
      console.error('[Upload API] Upload failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });

  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}