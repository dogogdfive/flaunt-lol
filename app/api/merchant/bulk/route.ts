// app/api/merchant/bulk/route.ts
// Merchant bulk actions API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { action, ids, data } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Action and IDs are required' },
        { status: 400 }
      );
    }

    // Get merchant's store
    const store = await prisma.store.findFirst({
      where: { ownerId: user.id },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    let result = { success: 0, failed: 0 };

    switch (action) {
      case 'delete_products': {
        for (const id of ids) {
          try {
            // Verify product belongs to merchant's store
            const product = await prisma.product.findFirst({
              where: { id, storeId: store.id },
            });

            if (product) {
              await prisma.product.delete({ where: { id } });
              result.success++;
            } else {
              result.failed++;
            }
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'set_out_of_stock': {
        for (const id of ids) {
          try {
            await prisma.product.updateMany({
              where: { id, storeId: store.id },
              data: { quantity: 0 },
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'update_quantity': {
        const quantity = data?.quantity;
        if (quantity === undefined || quantity < 0) {
          return NextResponse.json(
            { error: 'Valid quantity is required' },
            { status: 400 }
          );
        }

        for (const id of ids) {
          try {
            await prisma.product.updateMany({
              where: { id, storeId: store.id },
              data: { quantity },
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'move_to_collection': {
        const collectionId = data?.collectionId;
        if (!collectionId) {
          return NextResponse.json(
            { error: 'Collection ID is required' },
            { status: 400 }
          );
        }

        // Verify collection belongs to store
        const collection = await prisma.collection.findFirst({
          where: { id: collectionId, storeId: store.id },
        });

        if (!collection) {
          return NextResponse.json(
            { error: 'Collection not found' },
            { status: 404 }
          );
        }

        for (const productId of ids) {
          try {
            // Check if product belongs to store
            const product = await prisma.product.findFirst({
              where: { id: productId, storeId: store.id },
            });

            if (!product) {
              result.failed++;
              continue;
            }

            // Add to collection (upsert to avoid duplicates)
            await prisma.productCollection.upsert({
              where: {
                productId_collectionId: {
                  productId,
                  collectionId,
                },
              },
              create: {
                productId,
                collectionId,
              },
              update: {},
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'remove_from_collection': {
        const collectionId = data?.collectionId;
        if (!collectionId) {
          return NextResponse.json(
            { error: 'Collection ID is required' },
            { status: 400 }
          );
        }

        for (const productId of ids) {
          try {
            await prisma.productCollection.deleteMany({
              where: {
                productId,
                collectionId,
                collection: { storeId: store.id },
              },
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'set_draft': {
        for (const id of ids) {
          try {
            await prisma.product.updateMany({
              where: { id, storeId: store.id },
              data: { status: 'DRAFT' },
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'submit_for_review': {
        for (const id of ids) {
          try {
            // Only submit if it's a draft
            await prisma.product.updateMany({
              where: { id, storeId: store.id, status: 'DRAFT' },
              data: { status: 'PENDING' },
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      message: `${result.success} items processed, ${result.failed} failed`,
    });

  } catch (error) {
    console.error('Merchant bulk action error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please connect your wallet' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Bulk action failed' },
      { status: 500 }
    );
  }
}
