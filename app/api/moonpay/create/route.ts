// app/api/moonpay/create/route.ts
// Create MoonPay payment URL

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateMoonPayUrl, generateMoonPayWidgetConfig } from '@/lib/moonpay';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, paymentMethod, walletAddress } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        store: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.customerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (order.paymentStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      );
    }

    // Get platform wallet address
    const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET || '';
    if (!platformWallet) {
      return NextResponse.json(
        { error: 'Platform wallet not configured' },
        { status: 500 }
      );
    }

    // Map payment method to MoonPay currency
    let currency: 'SOL' | 'ETH' | 'USDT' | 'USD';
    let amount: number;

    switch (paymentMethod) {
      case 'solana':
        currency = 'SOL';
        amount = Number(order.subtotal); // Already in SOL if paymentCurrency is SOL
        if (order.paymentCurrency !== 'SOL') {
          // Convert USDC to SOL (approximate, MoonPay will handle final conversion)
          // This is just for the widget, actual conversion happens on MoonPay
          amount = Number(order.subtotal) / 200; // Rough SOL/USD conversion
        }
        break;
      case 'ethereum':
        currency = 'ETH';
        amount = Number(order.subtotal) / 3000; // Rough ETH/USD conversion
        break;
      case 'usdt':
        currency = 'USDT';
        amount = Number(order.subtotal); // USDT is pegged to USD
        break;
      case 'debit_card':
        currency = 'USD';
        amount = Number(order.subtotal); // For debit card, charge in USD
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
    }

    // Use customer's wallet address if provided, otherwise platform wallet
    const destinationWallet = walletAddress || platformWallet;

    // Generate MoonPay URL
    const moonpayUrl = generateMoonPayUrl({
      orderId: order.id,
      amount,
      currency,
      baseCurrency: paymentMethod === 'debit_card' ? 'USD' : undefined,
      walletAddress: paymentMethod !== 'debit_card' ? destinationWallet : undefined,
      email: order.customerEmail || user.email || undefined,
      redirectURL: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?payment=moonpay&orderId=${order.id}&status=pending`,
    });

    // Generate widget config for embedded widget
    const widgetConfig = generateMoonPayWidgetConfig({
      orderId: order.id,
      amount,
      currency,
      baseCurrency: paymentMethod === 'debit_card' ? 'USD' : undefined,
      walletAddress: paymentMethod !== 'debit_card' ? destinationWallet : undefined,
      email: order.customerEmail || user.email || undefined,
      redirectURL: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?payment=moonpay&orderId=${order.id}&status=pending`,
    });

    return NextResponse.json({
      success: true,
      url: moonpayUrl,
      widgetConfig,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

  } catch (error) {
    console.error('MoonPay payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create MoonPay payment' },
      { status: 500 }
    );
  }
}
