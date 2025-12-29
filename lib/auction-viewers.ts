// lib/auction-viewers.ts
// Real-time viewer tracking for Dutch Auctions
// Uses in-memory tracking per server instance

// Track connected viewers per auction
// Map<auctionId, Set<viewerId>>
const auctionViewers = new Map<string, Set<string>>();

// Track viewer metadata for richer display
interface ViewerInfo {
  viewerId: string;
  walletAddress?: string;
  joinedAt: Date;
}
const viewerMetadata = new Map<string, Map<string, ViewerInfo>>();

/**
 * Add a viewer to an auction
 * @param auctionId - The auction ID
 * @param viewerId - Unique identifier for this viewer (can be wallet address or session ID)
 * @param walletAddress - Optional wallet address if user is logged in
 */
export function addViewer(auctionId: string, viewerId: string, walletAddress?: string): void {
  // Initialize set if needed
  if (!auctionViewers.has(auctionId)) {
    auctionViewers.set(auctionId, new Set());
  }
  auctionViewers.get(auctionId)!.add(viewerId);

  // Store metadata
  if (!viewerMetadata.has(auctionId)) {
    viewerMetadata.set(auctionId, new Map());
  }
  viewerMetadata.get(auctionId)!.set(viewerId, {
    viewerId,
    walletAddress,
    joinedAt: new Date(),
  });
}

/**
 * Remove a viewer from an auction
 */
export function removeViewer(auctionId: string, viewerId: string): void {
  auctionViewers.get(auctionId)?.delete(viewerId);
  viewerMetadata.get(auctionId)?.delete(viewerId);

  // Cleanup empty sets
  if (auctionViewers.get(auctionId)?.size === 0) {
    auctionViewers.delete(auctionId);
    viewerMetadata.delete(auctionId);
  }
}

/**
 * Get the current viewer count for an auction
 */
export function getViewerCount(auctionId: string): number {
  return auctionViewers.get(auctionId)?.size || 0;
}

/**
 * Get all viewer IDs for an auction
 */
export function getViewerIds(auctionId: string): string[] {
  const viewers = auctionViewers.get(auctionId);
  return viewers ? Array.from(viewers) : [];
}

/**
 * Get viewer metadata for an auction
 */
export function getViewerMetadata(auctionId: string): ViewerInfo[] {
  const metadata = viewerMetadata.get(auctionId);
  return metadata ? Array.from(metadata.values()) : [];
}

/**
 * Check if a specific viewer is watching an auction
 */
export function isViewerWatching(auctionId: string, viewerId: string): boolean {
  return auctionViewers.get(auctionId)?.has(viewerId) || false;
}

/**
 * Get all active auctions (with viewers)
 */
export function getActiveAuctions(): string[] {
  return Array.from(auctionViewers.keys());
}

/**
 * Get viewer stats across all auctions
 */
export function getGlobalStats(): {
  totalViewers: number;
  activeAuctions: number;
  auctionStats: { auctionId: string; viewerCount: number }[];
} {
  const auctionStats: { auctionId: string; viewerCount: number }[] = [];
  let totalViewers = 0;

  for (const [auctionId, viewers] of auctionViewers) {
    const count = viewers.size;
    totalViewers += count;
    auctionStats.push({ auctionId, viewerCount: count });
  }

  return {
    totalViewers,
    activeAuctions: auctionViewers.size,
    auctionStats,
  };
}

/**
 * Generate a unique viewer ID for anonymous users
 * Uses a combination of timestamp and random string
 */
export function generateViewerId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `anon_${timestamp}_${random}`;
}

/**
 * Cleanup stale viewers (for use with periodic cleanup)
 * Removes viewers who haven't been seen in the specified timeout
 */
export function cleanupStaleViewers(auctionId: string, timeoutMs: number = 60000): number {
  const metadata = viewerMetadata.get(auctionId);
  if (!metadata) return 0;

  const now = new Date();
  let removed = 0;

  for (const [viewerId, info] of metadata) {
    if (now.getTime() - info.joinedAt.getTime() > timeoutMs) {
      removeViewer(auctionId, viewerId);
      removed++;
    }
  }

  return removed;
}
