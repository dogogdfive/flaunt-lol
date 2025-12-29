// app/api/price/route.ts
// Live SOL price API - fetches from CoinGecko

import { NextResponse } from 'next/server';

// Cache the price for 60 seconds to avoid rate limiting
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 60 seconds

export async function GET() {
  try {
    // Check cache first
    if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        price: cachedPrice.price,
        cached: true,
        source: 'coingecko',
      });
    }

    // Fetch live price from CoinGecko (free, no API key needed)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch price from CoinGecko');
    }

    const data = await response.json();
    const solPrice = data.solana?.usd;

    if (!solPrice) {
      throw new Error('Invalid price data');
    }

    // Update cache
    cachedPrice = {
      price: solPrice,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      success: true,
      price: solPrice,
      cached: false,
      source: 'coingecko',
    });

  } catch (error) {
    console.error('Error fetching SOL price:', error);

    // Return cached price if available, even if expired
    if (cachedPrice) {
      return NextResponse.json({
        success: true,
        price: cachedPrice.price,
        cached: true,
        stale: true,
        source: 'coingecko',
      });
    }

    // Fallback price if everything fails
    return NextResponse.json({
      success: true,
      price: 200, // Fallback
      cached: false,
      fallback: true,
      source: 'fallback',
    });
  }
}
