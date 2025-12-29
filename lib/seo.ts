// lib/seo.ts
// SEO utilities for generating meta tags

export interface SEOData {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  price?: {
    amount: string;
    currency: string;
  };
  availability?: 'in stock' | 'out of stock';
}

const SITE_NAME = 'Flaunt.lol';
const DEFAULT_DESCRIPTION = 'The Solana-powered marketplace for digital and physical goods. Buy and sell with crypto.';
const DEFAULT_IMAGE = '/og-default.png';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://flaunt.lol';

export function generateMetadata(data: Partial<SEOData>) {
  const title = data.title ? `${data.title} | ${SITE_NAME}` : SITE_NAME;
  const description = data.description || DEFAULT_DESCRIPTION;
  const image = data.image || DEFAULT_IMAGE;
  const url = data.url || BASE_URL;
  const type = data.type || 'website';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: image.startsWith('http') ? image : `${BASE_URL}${image}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type,
      ...(data.price && {
        'product:price:amount': data.price.amount,
        'product:price:currency': data.price.currency,
      }),
      ...(data.availability && {
        'product:availability': data.availability,
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.startsWith('http') ? image : `${BASE_URL}${image}`],
    },
  };
}

export function generateProductSchema(product: {
  name: string;
  description?: string;
  image: string;
  price: number;
  currency: string;
  availability: boolean;
  storeName: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: product.availability 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.storeName,
      },
    },
    url: product.url,
  };
}

export function generateStoreSchema(store: {
  name: string;
  description?: string;
  logo?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.description,
    logo: store.logo,
    url: store.url,
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
