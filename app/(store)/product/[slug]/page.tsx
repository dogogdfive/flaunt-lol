// app/(store)/product/[slug]/page.tsx
// Product detail page

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { generateProductSchema } from '@/lib/seo';
import ProductClient from './ProductClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await prisma.product.findFirst({
      where: { slug, status: 'APPROVED' },
      include: { store: true },
    });

    if (!product) return { title: 'Product Not Found | flaunt.lol' };

    const title = `${product.name} | flaunt.lol`;
    const description = product.description || `${product.name} by ${product.store.name}`;
    const image = product.images[0] || '/og-default.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: image }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch (error) {
    console.error('generateMetadata error:', error);
    return { title: 'flaunt.lol' };
  }
}

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const isPreviewMode = resolvedSearchParams?.preview === 'true';

  const product = await prisma.product.findFirst({
    where: isPreviewMode
      ? { slug }
      : { slug, status: 'APPROVED' },
    include: {
      store: {
        select: { id: true, name: true, slug: true, logoUrl: true, isVerified: true, tradesEnabled: true, ownerId: true },
      },
      variants: {
        orderBy: { name: 'asc' },
      },
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const relatedProducts = await prisma.product.findMany({
    where: {
      storeId: product.storeId,
      status: 'APPROVED',
      id: { not: product.id },
    },
    take: 4,
  });

  const productData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceSol: Number(product.priceSol),
    images: product.images,
    quantity: product.quantity,
    status: product.status,
    variants: product.variants.map(v => ({
      id: v.id,
      name: v.name,
      priceSol: v.priceSol ? Number(v.priceSol) : null,
      quantity: v.quantity,
    })),
    store: product.store,
    category: product.category,
    bondingEnabled: product.bondingEnabled,
    bondingGoal: product.bondingGoal,
    bondingCurrent: product.bondingCurrent,
    isPreview: isPreviewMode && product.status !== 'APPROVED',
  };

  const related = relatedProducts.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceSol: Number(p.priceSol),
    image: p.images[0],
    quantity: p.quantity,
  }));

  const schema = generateProductSchema({
    name: product.name,
    description: product.description || '',
    image: product.images[0] || '',
    price: Number(product.priceSol),
    currency: 'SOL',
    availability: product.quantity > 0,
    storeName: product.store.name,
    url: `https://flaunt.lol/product/${product.slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ProductClient product={productData} relatedProducts={related} />
    </>
  );
}
