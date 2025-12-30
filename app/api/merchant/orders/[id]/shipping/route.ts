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
            name: true,
            contactEmail: true,
            contactPhone: true,
            businessName: true,
            businessAddress: true,
            businessCity: true,
            businessState: true,
            businessZip: true,
            businessCountry: true,
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

    // Check if store has required shipping info
    const store = order.store;
    if (!store.contactEmail || !store.contactPhone) {
      return NextResponse.json({
        error: 'Seller info missing. Please add your email and phone number in Store Settings before purchasing labels.',
        missingFields: {
          email: !store.contactEmail,
          phone: !store.contactPhone,
        }
      }, { status: 400 });
    }

    if (!store.businessAddress || !store.businessCity || !store.businessState || !store.businessZip) {
      return NextResponse.json({
        error: 'Business address missing. Please add your business address in Store Settings before purchasing labels.',
        missingFields: {
          address: !store.businessAddress,
          city: !store.businessCity,
          state: !store.businessState,
          zip: !store.businessZip,
        }
      }, { status: 400 });
    }

    // Use merchant's business address for shipping from
    const fromAddress = {
      name: store.businessName || store.name,
      street1: store.businessAddress,
      city: store.businessCity,
      state: store.businessState,
      zip: store.businessZip,
      country: store.businessCountry || 'US',
      email: store.contactEmail,
      phone: store.contactPhone,
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

    const labelCost = parseFloat(body.price || '0');

    // Update order with label info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: transaction.tracking_number,
        trackingUrl: transaction.tracking_url_provider,
        labelUrl: transaction.label_url,
        labelCost,
        shippoRateId: rateId,
        shippoShipmentId: shipmentId,
        carrier: body.provider || 'USPS',
        status: 'SHIPPED',
        shippedAt: new Date(),
        estimatedDelivery,
      },
    });

    // Deduct label cost from merchant's payout
    if (labelCost > 0) {
      // Find pending payout for this order
      const payout = await prisma.payout.findFirst({
        where: {
          storeId: order.storeId,
          status: 'PENDING',
          orders: { some: { id: orderId } },
        },
      });

      if (payout) {
        // Deduct label cost from payout amount
        const newAmount = Math.max(0, Number(payout.amount) - labelCost);
        await prisma.payout.update({
          where: { id: payout.id },
          data: { amount: newAmount },
        });
        console.log(`[Shipping] Deducted $${labelCost} label cost from payout ${payout.id}. New amount: $${newAmount}`);
      } else {
        // No payout yet - the label cost is stored on the order
        // It will be deducted when calculating future payouts
        console.log(`[Shipping] Label cost $${labelCost} stored on order ${orderId} for future payout deduction`);
      }
    }

    return NextResponse.json({
      success: true,
      label: {
        trackingNumber: transaction.tracking_number,
        trackingUrl: transaction.tracking_url_provider,
        labelUrl: transaction.label_url,
      },
      labelCost,
      message: labelCost > 0 ? `Label cost of $${labelCost.toFixed(2)} will be deducted from your payout` : undefined,
    });
  } catch (error) {
    console.error('Purchase label error:', error);
    return NextResponse.json({ error: 'Failed to purchase label' }, { status: 500 });
  }
}
