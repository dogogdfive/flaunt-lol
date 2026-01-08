# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flaunt.lol is a Web3 e-commerce platform ("Shopify for Solana") where merchants sell products and customers pay with crypto (SOL/USDC). Built with Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL/Prisma, and Solana wallet integration.

## Common Commands

```bash
npm run dev          # Start development server at localhost:3000
npm run build        # Build for production (runs prisma generate first)
npm run lint         # Run ESLint
npm run db:push      # Push Prisma schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:seed      # Run seed script (tsx prisma/seed.ts)
```

## Architecture

### Authentication Flow
- No JWT/passwords - authentication is wallet-based via `x-wallet-address` header
- `lib/auth.ts` contains all auth helpers: `getCurrentUser()`, `requireAuth()`, `requireMerchant()`, `requireAdmin()`
- Users are auto-created on first request if wallet not found in DB
- Role hierarchy: CUSTOMER → MERCHANT → ADMIN → SUPER_ADMIN
- Secret super admin wallets (hardcoded prefixes in `lib/auth.ts`) auto-promote and cannot be demoted

### Route Groups (Next.js App Router)
- `app/(merchant)/merchant/*` - Merchant dashboard (products, orders, payouts, settings)
- `app/(admin)/admin/*` - Admin panel (approvals, analytics, user management)
- `app/(store)/store/[slug]/*` - Public store pages
- `app/api/*` - REST API endpoints (~80+)

### Approval Workflows
Products and stores require admin approval before becoming public:
- Products: DRAFT → PENDING → APPROVED/REJECTED
- Stores: PENDING → APPROVED/REJECTED/SUSPENDED
- Only APPROVED products from APPROVED stores appear on homepage

### Payment Flow
1. Customer checkout → POST `/api/payments/create`
2. Solana Pay QR/request generated via `lib/solana-pay.ts`
3. Payment verified on-chain
4. Order created, bonding curve updates (polled every 10s)
5. Merchant receives payout minus 3.5% platform fee after 7 days

### Key Database Models (prisma/schema.prisma)
- `User` - wallet address, role, ban status
- `Store` - merchant stores with approval status
- `Product` - items with pricing in SOL/USDC, bonding curve support
- `Order` / `OrderItem` - purchases with Solana Pay integration
- `Auction` - Dutch auctions with decay pricing
- `TradeOffer` - bartering system between users

### External Services
- Solana RPC (Helius) for blockchain queries
- Resend for transactional emails (`lib/email.ts`)
- Shippo for shipping labels (`lib/shippo.ts`)
- AWS S3 / Cloudflare R2 for uploads (`lib/upload.ts`)
- Sentry for error tracking

### API Route Pattern
```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await requireMerchant(); // or requireAdmin(), requireAuth()
    // ... handler logic
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please connect wallet' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Middleware
`middleware.ts` runs on all requests for bot protection and rate limiting (blocks 40+ known AI/scraper bots, 100 req/min normal, 30 req/min suspicious).

### Background Removal
Product images automatically have backgrounds removed on upload:
- `lib/remove-background.ts` - Client-side removal using `@imgly/background-removal`
- Runs in browser before upload to R2
- Works well for light-colored products; may struggle with dark products (black shirts, etc.)
- Graceful fallback: if removal fails, original image is uploaded

**Migration script** for existing images:
```bash
npm run migrate:backgrounds              # Process all products
npm run migrate:backgrounds -- --dry-run # Preview only
npm run migrate:backgrounds -- --limit 5 # Process 5 products
```
Requires Python 3.12 + rembg: `pip install rembg[cpu] pillow`

**Manual image upload to R2** (bypassing background removal):
```typescript
// See scripts/migrate-product-backgrounds.ts for example
// Upload directly to: productImage/{uuid}.png or .webp
```
