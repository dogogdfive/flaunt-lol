// app/api/auctions/[id]/buy/route.ts
// Purchase auction at current price

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCurrentPrice } from '@/lib/auction-pricing';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// POST: Purchase at current price
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { currency, shippingAddress } = body;

    if (!currency || !['SOL', 'USDC'].includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    // Get auction
    const auction = await prisma.auction.findUnique({
      where: { id: params.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            payoutWallet: true,
          },
        },
      },
    });

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Verify auction is live
    if (auction.status !== 'LIVE') {
      return NextResponse.json(
        { error: 'Auction is not active' },
        { status: 400 }
      );
    }

    // Verify quantity available
    if (auction.quantitySold >= auction.quantity) {
      return NextResponse.json(
        { error: 'Auction is sold out' },
        { status: 400 }
      );
    }

    // Calculate current price
    const pricing = {
      startPriceSol: Number(auction.startPriceSol),
      floorPriceSol: Number(auction.floorPriceSol),
      decayType: auction.decayType,
      decaySteps: auction.decaySteps as any,
      durationMinutes: auction.durationMinutes,
      startsAt: auction.startsAt,
    };

    const currentPriceSol = calculateCurrentPrice(pricing);

    // Calculate USDC price if paying in USDC
    let currentPriceUsdc = null;
    if (currency === 'USDC' && auction.startPriceUsdc && auction.floorPriceUsdc) {
      const usdcPricing = {
        startPriceSol: Number(auction.startPriceUsdc),
        floorPriceSol: Number(auction.floorPriceUsdc),
        decayType: auction.decayType,
        decaySteps: auction.decaySteps as any,
        durationMinutes: auction.durationMinutes,
        startsAt: auction.startsAt,
      };
      currentPriceUsdc = calculateCurrentPrice(usdcPricing);
    }

    const finalPrice = currency === 'USDC' && currentPriceUsdc ? currentPriceUsdc : currentPriceSol;

    // Generate payment reference
    const paymentReference = uuidv4();

    // Get platform fee (default 5%)
    const platformSettings = await prisma.platformSettings.findUnique({
      where: { key: 'fees' },
    });
    const feePercentage = (platformSettings?.value as any)?.platformFee || 5;
    const platformFee = finalPrice * (feePercentage / 100);
    const merchantAmount = finalPrice - platformFee;

    // Return payment details (client will handle actual payment)
    return NextResponse.json({
      success: true,
      paymentDetails: {
        auctionId: auction.id,
        auctionTitle: auction.title,
        price: finalPrice,
        currency,
        platformFee,
        merchantAmount,
        paymentReference,
        merchantWallet: auction.store.payoutWallet,
        // For Solana Pay or custom payment flow
        memo: `Auction: ${auction.title}`,
      },
    });
  } catch (error) {
    console.error('Error initiating auction purchase:', error);
    return NextResponse.json(
      { error: 'Failed to initiate purchase' },
      { status: 500 }
    );
  }
}

// PATCH: Confirm payment and complete purchase
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { paymentTx, paymentReference, currency, shippingAddress, pricePaid } = body;

    if (!paymentTx) {
      return NextResponse.json(
        { error: 'Payment transaction required' },
        { status: 400 }
      );
    }

    // Get auction
    const auction = await prisma.auction.findUnique({
      where: { id: params.id },
    });

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Verify auction is still active
    if (auction.status !== 'LIVE') {
      return NextResponse.json(
        { error: 'Auction is no longer active' },
        { status: 400 }
      );
    }

    // Verify not already sold
    if (auction.quantitySold >= auction.quantity) {
      return NextResponse.json(
        { error: 'Auction already sold' },
        { status: 400 }
      );
    }

    // Update auction as sold
    const updatedAuction = await prisma.auction.update({
      where: { id: params.id },
      data: {
        status: 'SOLD',
        winnerId: user.id,
        winningPriceSol: currency === 'SOL' ? pricePaid : null,
        winningPriceUsdc: currency === 'USDC' ? pricePaid : null,
        soldAt: new Date(),
        paymentCurrency: currency,
        paymentTx,
        paymentReference,
        shippingAddress: shippingAddress || null,
        quantitySold: auction.quantitySold + 1,
        mediaExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      include: {
        store: true,
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notification for merchant
    await prisma.notification.create({
      data: {
        userId: auction.merchantId,
        type: 'ORDER_PAID',
        title: 'Auction Sold!',
        message: `Your auction "${auction.title}" has been sold for ${pricePaid} ${currency}`,
        metadata: {
          auctionId: auction.id,
          buyerId: user.id,
          price: pricePaid,
          currency,
        },
      },
    });

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'AUCTION_WON',
        title: 'Auction Won!',
        message: `You won the auction "${auction.title}" for ${pricePaid} ${currency}`,
        metadata: {
          auctionId: auction.id,
          price: pricePaid,
          currency,
        },
      },
    });

    return NextResponse.json({
      success: true,
      auction: {
        ...updatedAuction,
        winningPriceSol: updatedAuction.winningPriceSol ? Number(updatedAuction.winningPriceSol) : null,
        winningPriceUsdc: updatedAuction.winningPriceUsdc ? Number(updatedAuction.winningPriceUsdc) : null,
      },
    });
  } catch (error) {
    console.error('Error confirming auction purchase:', error);
    return NextResponse.json(
      { error: 'Failed to confirm purchase' },
      { status: 500 }
    );
  }
}
