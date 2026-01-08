// app/(store)/store/[slug]/page.tsx
// Public store page

import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Store, Package, Star } from 'lucide-react';
import StoreProductCard from './StoreProductCard';
import StoreReviews from './StoreReviews';
import StoreHeader from './StoreHeader';

export const dynamic = 'force-dynamic';

// Helper to ensure URL has protocol
function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const store = await prisma.store.findUnique({
      where: { slug, status: 'APPROVED' },
    });

    if (!store) return { title: 'Store Not Found | flaunt.lol' };

    const title = `${store.name} | flaunt.lol`;
    const description = store.description || `Shop ${store.name} on flaunt.lol`;
    const image = store.bannerUrl || store.logoUrl || '/og-default.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: image }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch (error) {
    console.error('Store generateMetadata error:', error);
    return { title: 'flaunt.lol' };
  }
}

export default async function StorePublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug, status: 'APPROVED' },
    include: {
      products: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        include: {
          reviews: {
            select: {
              id: true,
              rating: true,
              content: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                  username: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      },
      _count: {
        select: { products: { where: { status: 'APPROVED' } } },
      },
    },
  });

  if (!store) {
    notFound();
  }

  const avgRating = store.avgRating;
  const reviewCount = store.reviewCount;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header with Hamburger Menu */}
      <StoreHeader
        twitterUrl={store.twitterUrl}
        telegramUrl={store.telegramUrl}
        discordUrl={store.discordUrl}
        websiteUrl={store.websiteUrl}
      />

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-blue-600 to-purple-700">
        {store.bannerUrl && (
          <img
            src={store.bannerUrl}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] to-transparent" />
      </div>

      {/* Store Info */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Logo */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-[#111827] border-4 border-[#0a0e1a] overflow-hidden flex-shrink-0">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="w-12 h-12 text-gray-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-8">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{store.name}</h1>
              {store.isVerified && (
                <svg className="w-6 h-6 text-pink-500" viewBox="0 0 22 22" fill="currentColor">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
                </svg>
              )}
            </div>
            {store.description && (
              <p className="text-gray-400 mb-3 max-w-2xl">{store.description}</p>
            )}
            {/* Star Rating Display */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(avgRating || 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
              {reviewCount > 0 ? (
                <span className="text-gray-400 text-sm">
                  {avgRating?.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              ) : (
                <span className="text-gray-500 text-sm">No reviews yet</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-gray-500">
                <Package className="w-4 h-4 inline mr-1" />
                {store._count.products} products
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold text-white mb-6">Products</h2>

        {store.products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>No products yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {store.products.map((product) => {
              const reviewCount = product.reviews.length;
              const avgRating = reviewCount > 0
                ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
                : null;
              return (
                <StoreProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    priceSol: Number(product.priceSol),
                    images: product.images,
                    quantity: product.quantity,
                    avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
                    reviewCount,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Reviews Section */}
        <StoreReviews
          storeSlug={store.slug}
          initialAvgRating={avgRating}
          initialReviewCount={reviewCount}
        />
      </div>
    </div>
  );
}
