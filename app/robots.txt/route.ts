// app/robots.txt/route.ts
// Dynamic robots.txt for SEO

import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flaunt.lol';

  const robotsTxt = `# robots.txt for ${baseUrl}
User-agent: *
Allow: /
Allow: /store/*
Allow: /product/*
Allow: /products

# Disallow admin and merchant areas
Disallow: /admin/*
Disallow: /merchant/*
Disallow: /account/*
Disallow: /checkout
Disallow: /api/*

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
