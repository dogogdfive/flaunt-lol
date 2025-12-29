// app/api/merchant/orders/[id]/shipping/route.ts
// Get shipping rates and purchase labels via Shippo

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createShipment, purchaseLabel } from '@/lib/shippo';

// GET - Get shipping rates for an order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;

    // Get order with store info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            ownerId: true,
            owner: { select: { walletAddress: true } },
            contactEmail: true,
          },
        },
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify merchant owns this store
    if (order.store.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const shippingAddress = order.shippingAddress as any;
    if (!shippingAddress) {
      return NextResponse.json({ error: 'No shipping address on order' }, { status: 400 });
    }

    // Get merchant's from address from store settings or use default
    const fromAddress = {
      name: order.store.contactEmail ? 'Store' : 'Flaunt.lol Seller',
      street1: process.env.STORE_ADDRESS_LINE1 || '123 Main St',
      city: process.env.STORE_CITY || 'Los Angeles',
      state: process.env.STORE_STATE || 'CA',
      zip: process.env.STORE_ZIP || '90001',
      country: process.env.STORE_COUNTRY || 'US',
    };

    const toAddress = {
      name: shippingAddress.name,
      street1: shippingAddress.line1,
      street2: shippingAddress.line2 || undefined,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zip: shippingAddress.postalCode,
      country: shippingAddress.country || 'US',
      email: order.customerEmail || undefined,
    };

    // Calculate parcel size based on items (simplified)
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const parcel = {
      length: Math.max(10, totalItems * 2),
      width: 8,
      height: Math.max(4, totalItems),
      distance_unit: 'in' as const,
      weight: Math.max(1, totalItems * 0.5),
      mass_unit: 'lb' as const,
    };

    const result = await createShipment(fromAddress, toAddress, parcel);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      shipmentId: result.shipment?.object_id,
      rates: result.rates?.map((rate) => ({
        id: rate.object_id,
        provider: rate.provider,
        service: rate.servicelevel.name,
        price: rate.amount,
        currency: rate.currency,
        estimatedDays: rate.estimated_days,
        duration: rate.duration_terms,
      })),
    });
  } catch (error) {
    console.error('Shipping rates error:', error);
    return NextResponse.json({ error: 'Failed to get shipping rates' }, { status: 500 });
  }
}

// POST - Purchase a shipping label
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await request.json();
    const { rateId, shipmentId } = body;

    if (!rateId) {
      return NextResponse.json({ error: 'Rate ID is required' }, { status: 400 });
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            ownerId: true,
            owner: { select: { walletAddress: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify merchant owns this store
    if (order.store.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Purchase label
    const result = await purchaseLabel(rateId);

    if (!result.success || !result.transaction) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const transaction = result.transaction;

    // Calculate ETA (add estimated days to now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // Default 5 days if not specified

    // Update order with label info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: transaction.tracking_number,
        trackingUrl: transaction.tracking_url_provider,
        labelUrl: transaction.label_url,
        labelCost: parseFloat(body.price || '0'),
        shippoRateId: rateId,
        shippoShipmentId: shipmentId,
        carrier: body.provider || 'USPS',
        status: 'SHIPPED',
        shippedAt: new Date(),
        estimatedDelivery,
      },
    });

    return NextResponse.json({
      success: true,
      label: {
        trackingNumber: transaction.tracking_number,
        trackingUrl: transaction.tracking_url_provider,
        labelUrl: transaction.label_url,
      },
    });
  } catch (error) {
    console.error('Purchase label error:', error);
    return NextResponse.json({ error: 'Failed to purchase label' }, { status: 500 });
  }
}
