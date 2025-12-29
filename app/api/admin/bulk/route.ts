// app/api/admin/bulk/route.ts
// Admin bulk actions API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { 
  notifyProductApproved, 
  notifyProductRejected,
  notifyStoreApproved,
  notifyStoreRejected,
} from '@/lib/notifications';
import {
  sendProductApproved,
  sendProductRejected,
  sendStoreApproved,
  sendStoreRejected,
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { action, ids, reason } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Action and IDs are required' },
        { status: 400 }
      );
    }

    let result = { success: 0, failed: 0 };

    switch (action) {
      // Product actions
      case 'approve_products': {
        for (const id of ids) {
          try {
            const product = await prisma.product.update({
              where: { id, status: 'PENDING' },
              data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedById: admin.id,
                rejectionReason: null,
              },
              include: {
                store: {
                  include: { owner: { select: { id: true, email: true } } },
                },
              },
            });

            // Notify merchant
            await notifyProductApproved(product.store.owner.id, product.id, product.name);
            if (product.store.owner.email) {
              await sendProductApproved(product.store.owner.email, product.name, product.store.name);
            }

            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'reject_products': {
        const rejectionReason = reason || 'Does not meet platform guidelines';
        for (const id of ids) {
          try {
            const product = await prisma.product.update({
              where: { id, status: 'PENDING' },
              data: {
                status: 'REJECTED',
                rejectionReason,
              },
              include: {
                store: {
                  include: { owner: { select: { id: true, email: true } } },
                },
              },
            });

            // Notify merchant
            await notifyProductRejected(product.store.owner.id, product.id, product.name, rejectionReason);
            if (product.store.owner.email) {
              await sendProductRejected(product.store.owner.email, product.name, product.store.name, rejectionReason);
            }

            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'delete_products': {
        for (const id of ids) {
          try {
            await prisma.product.delete({ where: { id } });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      // Store actions
      case 'approve_stores': {
        for (const id of ids) {
          try {
            const store = await prisma.store.update({
              where: { id, status: 'PENDING' },
              data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedById: admin.id,
                rejectionReason: null,
              },
              include: { owner: { select: { id: true, email: true, role: true } } },
            });

            // Promote to merchant if customer
            if (store.owner.role === 'CUSTOMER') {
              await prisma.user.update({
                where: { id: store.owner.id },
                data: { role: 'MERCHANT' },
              });
            }

            // Notify merchant
            await notifyStoreApproved(store.owner.id, store.id, store.name);
            if (store.owner.email) {
              await sendStoreApproved(store.owner.email, store.name);
            }

            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'reject_stores': {
        const rejectionReason = reason || 'Does not meet platform requirements';
        for (const id of ids) {
          try {
            const store = await prisma.store.update({
              where: { id, status: 'PENDING' },
              data: {
                status: 'REJECTED',
                rejectionReason,
              },
              include: { owner: { select: { id: true, email: true } } },
            });

            // Notify merchant
            await notifyStoreRejected(store.owner.id, store.id, store.name, rejectionReason);
            if (store.owner.email) {
              await sendStoreRejected(store.owner.email, store.name, rejectionReason);
            }

            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'suspend_stores': {
        for (const id of ids) {
          try {
            await prisma.store.update({
              where: { id },
              data: { status: 'SUSPENDED' },
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'delete_stores': {
        for (const id of ids) {
          try {
            // Delete all related data first
            await prisma.orderItem.deleteMany({
              where: { order: { storeId: id } },
            });
            await prisma.order.deleteMany({
              where: { storeId: id },
            });
            await prisma.productVariant.deleteMany({
              where: { product: { storeId: id } },
            });
            await prisma.cartItem.deleteMany({
              where: { product: { storeId: id } },
            });
            await prisma.wishlistItem.deleteMany({
              where: { product: { storeId: id } },
            });
            await prisma.product.deleteMany({
              where: { storeId: id },
            });
            await prisma.store.delete({ where: { id } });
            result.success++;
          } catch (e) {
            console.error('Failed to delete store:', id, e);
            result.failed++;
          }
        }
        break;
      }

      // User actions
      case 'ban_users': {
        const banReason = reason || 'Violation of terms of service';
        for (const id of ids) {
          try {
            await prisma.user.update({
              where: { id },
              data: { isBanned: true, bannedReason: banReason },
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        break;
      }

      case 'unban_users': {
        for (const id of ids) {
          try {
            await prisma.user.update({
              where: { id },
              data: { isBanned: false, bannedReason: null },
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
    console.error('Bulk action error:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Bulk action failed' },
      { status: 500 }
    );
  }
}
