// lib/notifications.ts
// Helper functions to create notifications

import prisma from './prisma';

type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_PAID'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_DISPUTED'
  | 'TRACKING_ADDED'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_REJECTED'
  | 'STORE_APPROVED'
  | 'STORE_REJECTED'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'PRODUCT_UPDATED'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'REVIEW_RECEIVED'
  | 'SYSTEM';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata,
}: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
    },
  });
}

// Convenience functions for common notifications

export async function notifyOrderPlaced(merchantUserId: string, orderId: string, orderNumber: string, amount: string) {
  return createNotification({
    userId: merchantUserId,
    type: 'ORDER_PLACED',
    title: 'New Order Received',
    message: `New order #${orderNumber} for ${amount}`,
    metadata: { orderId, orderNumber, amount },
  });
}

export async function notifyOrderPaid(merchantUserId: string, orderId: string, orderNumber: string, amount: string) {
  return createNotification({
    userId: merchantUserId,
    type: 'ORDER_PAID',
    title: 'Payment Received',
    message: `Payment confirmed for order #${orderNumber}`,
    metadata: { orderId, orderNumber, amount },
  });
}

export async function notifyTrackingAdded(
  userId: string, 
  orderId: string, 
  trackingNumber: string, 
  carrier?: string
) {
  return createNotification({
    userId,
    type: 'TRACKING_ADDED',
    title: 'Tracking Number Added',
    message: `Tracking number added for order "${orderId.slice(0, 8)}..."`,
    metadata: { orderId, trackingNumber, carrier },
  });
}

export async function notifyProductApproved(merchantUserId: string, productId: string, productName: string) {
  return createNotification({
    userId: merchantUserId,
    type: 'PRODUCT_APPROVED',
    title: 'Product Approved',
    message: `Your product "${productName}" has been approved and is now live!`,
    metadata: { productId, productName },
  });
}

export async function notifyProductRejected(
  merchantUserId: string, 
  productId: string, 
  productName: string, 
  reason: string
) {
  return createNotification({
    userId: merchantUserId,
    type: 'PRODUCT_REJECTED',
    title: 'Product Rejected',
    message: `Your product "${productName}" was rejected: ${reason}`,
    metadata: { productId, productName, reason },
  });
}

export async function notifyStoreApproved(merchantUserId: string, storeId: string, storeName: string) {
  return createNotification({
    userId: merchantUserId,
    type: 'STORE_APPROVED',
    title: 'Store Approved',
    message: `Your store "${storeName}" has been approved! You can now start adding products.`,
    metadata: { storeId, storeName },
  });
}

export async function notifyStoreRejected(
  merchantUserId: string, 
  storeId: string, 
  storeName: string, 
  reason: string
) {
  return createNotification({
    userId: merchantUserId,
    type: 'STORE_REJECTED',
    title: 'Store Application Rejected',
    message: `Your store "${storeName}" application was rejected: ${reason}`,
    metadata: { storeId, storeName, reason },
  });
}

export async function notifyPayoutCompleted(
  merchantUserId: string, 
  payoutId: string, 
  amount: string,
  txSignature: string
) {
  return createNotification({
    userId: merchantUserId,
    type: 'PAYOUT_COMPLETED',
    title: 'Payout Completed',
    message: `Payout of ${amount} has been sent to your wallet`,
    metadata: { payoutId, amount, txSignature },
  });
}

export async function notifyLowStock(merchantUserId: string, productId: string, productName: string, quantity: number) {
  return createNotification({
    userId: merchantUserId,
    type: 'LOW_STOCK',
    title: 'Low Stock Alert',
    message: `"${productName}" has only ${quantity} items left in stock`,
    metadata: { productId, productName, quantity },
  });
}

export async function notifyProductUpdated(
  merchantUserId: string,
  productId: string,
  productName: string,
  collectionName: string,
  updatedBy: string
) {
  return createNotification({
    userId: merchantUserId,
    type: 'PRODUCT_UPDATED',
    title: 'Product Updated',
    message: `Product "${productName}" was updated in collection "${collectionName}" by ${updatedBy}`,
    metadata: { productId, productName, collectionName, updatedBy },
  });
}

// Trade notification functions
export async function notifyTradeReceived(
  merchantUserId: string,
  tradeId: string,
  productName: string,
  buyerName: string
) {
  return createNotification({
    userId: merchantUserId,
    type: 'TRADE_RECEIVED' as NotificationType,
    title: 'New Trade Offer',
    message: `${buyerName} wants to trade for "${productName}"`,
    metadata: { tradeId, productName, buyerName },
  });
}

export async function notifyTradeAccepted(
  buyerUserId: string,
  tradeId: string,
  productName: string,
  storeName: string
) {
  return createNotification({
    userId: buyerUserId,
    type: 'TRADE_ACCEPTED' as NotificationType,
    title: 'Trade Offer Accepted',
    message: `${storeName} accepted your trade offer for "${productName}"!`,
    metadata: { tradeId, productName, storeName },
  });
}

export async function notifyTradeDeclined(
  buyerUserId: string,
  tradeId: string,
  productName: string,
  storeName: string,
  reason?: string
) {
  return createNotification({
    userId: buyerUserId,
    type: 'TRADE_DECLINED' as NotificationType,
    title: 'Trade Offer Declined',
    message: reason
      ? `${storeName} declined your trade for "${productName}": ${reason}`
      : `${storeName} declined your trade offer for "${productName}"`,
    metadata: { tradeId, productName, storeName, reason },
  });
}

export async function notifyTradeCancelled(
  recipientUserId: string,
  tradeId: string,
  productName: string,
  cancelledBy: string
) {
  return createNotification({
    userId: recipientUserId,
    type: 'TRADE_CANCELLED' as NotificationType,
    title: 'Trade Offer Cancelled',
    message: `Trade offer for "${productName}" was cancelled by ${cancelledBy}`,
    metadata: { tradeId, productName, cancelledBy },
  });
}
