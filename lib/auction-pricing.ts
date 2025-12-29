// lib/auction-pricing.ts
// Dutch Auction price calculation logic

export type DecayType = 'LINEAR' | 'STEPPED' | 'CUSTOM';

export interface DecayStep {
  timeMinutes: number;  // Minutes from start
  priceSol: number;
}

export interface AuctionPricing {
  startPriceSol: number;
  floorPriceSol: number;
  decayType: DecayType;
  decaySteps?: DecayStep[] | null;  // For STEPPED/CUSTOM
  durationMinutes: number;
  startsAt: Date;
}

/**
 * Calculate the current price of a Dutch Auction
 * All calculations done server-side for accuracy
 */
export function calculateCurrentPrice(auction: AuctionPricing): number {
  const now = new Date();
  const startsAt = new Date(auction.startsAt);

  // If auction hasn't started, return start price
  if (now < startsAt) {
    return auction.startPriceSol;
  }

  // Calculate elapsed time in minutes
  const elapsedMs = now.getTime() - startsAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);

  // If auction has ended (past duration), return floor price
  if (elapsedMinutes >= auction.durationMinutes) {
    return auction.floorPriceSol;
  }

  // Calculate based on decay type
  switch (auction.decayType) {
    case 'LINEAR':
      return calculateLinearPrice(auction, elapsedMinutes);
    case 'STEPPED':
      return calculateSteppedPrice(auction, elapsedMinutes);
    case 'CUSTOM':
      return calculateCustomPrice(auction, elapsedMinutes);
    default:
      return auction.startPriceSol;
  }
}

function calculateLinearPrice(auction: AuctionPricing, elapsedMinutes: number): number {
  const priceRange = auction.startPriceSol - auction.floorPriceSol;
  const progress = elapsedMinutes / auction.durationMinutes;
  const currentPrice = auction.startPriceSol - (priceRange * progress);
  return Math.max(currentPrice, auction.floorPriceSol);
}

function calculateSteppedPrice(auction: AuctionPricing, elapsedMinutes: number): number {
  if (!auction.decaySteps || auction.decaySteps.length === 0) {
    return calculateLinearPrice(auction, elapsedMinutes);
  }

  // Sort steps by time
  const steps = [...auction.decaySteps].sort((a, b) => a.timeMinutes - b.timeMinutes);

  // Find the current step
  let currentPrice = auction.startPriceSol;
  for (const step of steps) {
    if (elapsedMinutes >= step.timeMinutes) {
      currentPrice = step.priceSol;
    } else {
      break;
    }
  }

  return Math.max(currentPrice, auction.floorPriceSol);
}

function calculateCustomPrice(auction: AuctionPricing, elapsedMinutes: number): number {
  // Custom allows any decay curve via steps with interpolation
  if (!auction.decaySteps || auction.decaySteps.length === 0) {
    return calculateLinearPrice(auction, elapsedMinutes);
  }

  const steps = [...auction.decaySteps].sort((a, b) => a.timeMinutes - b.timeMinutes);

  // Add start and end points if not present
  if (steps[0].timeMinutes > 0) {
    steps.unshift({ timeMinutes: 0, priceSol: auction.startPriceSol });
  }
  if (steps[steps.length - 1].timeMinutes < auction.durationMinutes) {
    steps.push({ timeMinutes: auction.durationMinutes, priceSol: auction.floorPriceSol });
  }

  // Find surrounding steps and interpolate
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];

    if (elapsedMinutes >= current.timeMinutes && elapsedMinutes < next.timeMinutes) {
      // Linear interpolation between steps
      const stepProgress = (elapsedMinutes - current.timeMinutes) / (next.timeMinutes - current.timeMinutes);
      const priceRange = current.priceSol - next.priceSol;
      return current.priceSol - (priceRange * stepProgress);
    }
  }

  return auction.floorPriceSol;
}

/**
 * Calculate "temperature" for thermometer (0 = cold/floor, 100 = hot/start)
 */
export function calculateTemperature(auction: AuctionPricing): number {
  const currentPrice = calculateCurrentPrice(auction);
  const priceRange = auction.startPriceSol - auction.floorPriceSol;

  if (priceRange === 0) return 50; // Edge case

  const priceFromFloor = currentPrice - auction.floorPriceSol;
  const temperature = (priceFromFloor / priceRange) * 100;

  return Math.max(0, Math.min(100, temperature));
}

/**
 * Get time remaining in auction
 */
export function getTimeRemaining(auction: AuctionPricing): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  expired: boolean;
} {
  const now = new Date();
  const startsAt = new Date(auction.startsAt);
  const endsAt = new Date(startsAt.getTime() + auction.durationMinutes * 60 * 1000);

  // If auction hasn't started yet
  if (now < startsAt) {
    const remainingMs = endsAt.getTime() - startsAt.getTime();
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds, totalSeconds, expired: false };
  }

  if (now >= endsAt) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, expired: true };
  }

  const remainingMs = endsAt.getTime() - now.getTime();
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds, expired: false };
}

/**
 * Get time until auction starts (for scheduled auctions)
 */
export function getTimeUntilStart(startsAt: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  started: boolean;
} {
  const now = new Date();
  const start = new Date(startsAt);

  if (now >= start) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
  }

  const remainingMs = start.getTime() - now.getTime();
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, started: false };
}

/**
 * Generate default decay steps for stepped decay
 * Creates equal price drops at regular intervals
 */
export function generateDefaultSteps(
  startPrice: number,
  floorPrice: number,
  durationMinutes: number,
  stepCount: number = 5
): DecayStep[] {
  const priceRange = startPrice - floorPrice;
  const priceStep = priceRange / stepCount;
  const timeStep = durationMinutes / stepCount;

  const steps: DecayStep[] = [];

  for (let i = 1; i <= stepCount; i++) {
    steps.push({
      timeMinutes: Math.round(timeStep * i),
      priceSol: Math.max(startPrice - (priceStep * i), floorPrice),
    });
  }

  return steps;
}
