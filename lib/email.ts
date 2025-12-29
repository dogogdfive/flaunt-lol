// lib/email.ts
// Email service using Resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'Flaunt.lol <noreply@mail.flaunt.lol>';
const PLATFORM_NAME = 'Flaunt.lol';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailOptions) {
  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured - emails disabled');
    return { success: false, error: 'Email not configured' };
  }

  try {
    console.log(`📧 Sending email to ${to}: ${subject}`);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error };
    }

    console.log(`✅ Email sent successfully:`, data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error };
  }
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${PLATFORM_NAME}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e1a; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .content { background: #111827; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; }
    h1 { color: #ffffff; font-size: 24px; margin: 0 0 16px 0; }
    p { color: #9ca3af; line-height: 1.6; margin: 0 0 16px 0; }
    .button { display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .highlight { color: #ffffff; font-weight: 600; }
    .divider { border-top: 1px solid #374151; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #374151; }
    .info-label { color: #6b7280; }
    .info-value { color: #ffffff; }
    .product-item { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid #374151; }
    .product-image { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; }
    .product-details { flex: 1; }
    .product-name { color: #ffffff; font-weight: 600; margin-bottom: 4px; }
    .product-variant { color: #6b7280; font-size: 14px; }
    .product-price { color: #3b82f6; font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; padding: 16px 0; font-size: 18px; font-weight: bold; }
    .alert { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .alert-text { color: #92400e; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🛍️ ${PLATFORM_NAME}</div>
    </div>
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${PLATFORM_NAME}. All rights reserved.</p>
      <p>Powered by Solana</p>
    </div>
  </div>
</body>
</html>
`;

// ==========================================
// CUSTOMER EMAILS
// ==========================================

interface OrderItem {
  name: string;
  variant?: string;
  quantity: number;
  price: string;
  image?: string;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: string;
  currency: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  storeName: string;
}

export async function sendOrderConfirmation(to: string, data: OrderEmailData) {
  const itemsHtml = data.items.map(item => `
    <div class="product-item">
      ${item.image ? `<img src="${item.image}" alt="${item.name}" class="product-image">` : ''}
      <div class="product-details">
        <div class="product-name">${item.name}</div>
        ${item.variant ? `<div class="product-variant">${item.variant}</div>` : ''}
        <div class="product-variant">Qty: ${item.quantity}</div>
      </div>
      <div class="product-price">${item.price} ${data.currency}</div>
    </div>
  `).join('');

  const content = `
    <div class="content">
      <h1>Order Confirmed! 🎉</h1>
      <p>Hi ${data.customerName}, thanks for your order from <span class="highlight">${data.storeName}</span>!</p>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">Order #${data.orderNumber}</p>
      
      ${itemsHtml}
      
      <div class="total-row">
        <span>Total</span>
        <span>${data.subtotal} ${data.currency}</span>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #ffffff; font-weight: 600; margin-bottom: 8px;">Shipping to:</p>
      <p style="color: #9ca3af; margin: 0;">
        ${data.shippingAddress.name}<br>
        ${data.shippingAddress.line1}<br>
        ${data.shippingAddress.line2 ? data.shippingAddress.line2 + '<br>' : ''}
        ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
        ${data.shippingAddress.country}
      </p>
      
      <div class="divider"></div>
      
      <p>We'll send you another email when your order ships with tracking info.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Order Confirmed - #${data.orderNumber}`,
    html: baseTemplate(content),
  });
}

interface TrackingEmailData {
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl?: string;
  storeName: string;
}

export async function sendShippingConfirmation(to: string, data: TrackingEmailData) {
  const content = `
    <div class="content">
      <h1>Your Order Has Shipped! 📦</h1>
      <p>Hi ${data.customerName}, great news! Your order from <span class="highlight">${data.storeName}</span> is on its way.</p>
      
      <div class="divider"></div>
      
      <div class="info-row">
        <span class="info-label">Order</span>
        <span class="info-value">#${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Carrier</span>
        <span class="info-value">${data.carrier}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Tracking Number</span>
        <span class="info-value">${data.trackingNumber}</span>
      </div>
      
      <div class="divider"></div>
      
      ${data.trackingUrl ? `
        <p style="text-align: center;">
          <a href="${data.trackingUrl}" class="button">Track Your Package</a>
        </p>
      ` : ''}
    </div>
  `;

  return sendEmail({
    to,
    subject: `Your Order Has Shipped - #${data.orderNumber}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// MERCHANT EMAILS
// ==========================================

interface NewOrderMerchantData {
  orderNumber: string;
  items: OrderItem[];
  subtotal: string;
  merchantAmount: string;
  currency: string;
  shippingAddress: {
    name: string;
    email: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  storeName: string;
}

export async function sendNewOrderNotification(to: string, data: NewOrderMerchantData) {
  const itemsHtml = data.items.map(item => `
    <div class="product-item">
      <div class="product-details">
        <div class="product-name">${item.name}</div>
        ${item.variant ? `<div class="product-variant">${item.variant}</div>` : ''}
        <div class="product-variant">Qty: ${item.quantity}</div>
      </div>
      <div class="product-price">${item.price} ${data.currency}</div>
    </div>
  `).join('');

  const content = `
    <div class="content">
      <h1>New Order Received! 💰</h1>
      <p>You've received a new order for <span class="highlight">${data.storeName}</span>!</p>
      
      <div class="divider"></div>
      
      <p style="color: #6b7280; font-size: 14px;">Order #${data.orderNumber}</p>
      
      ${itemsHtml}
      
      <div class="total-row">
        <span>Your Earnings</span>
        <span style="color: #10b981;">${data.merchantAmount} ${data.currency}</span>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #ffffff; font-weight: 600; margin-bottom: 8px;">Ship to:</p>
      <p style="color: #9ca3af; margin: 0;">
        ${data.shippingAddress.name}<br>
        ${data.shippingAddress.email}<br>
        ${data.shippingAddress.phone ? data.shippingAddress.phone + '<br>' : ''}
        ${data.shippingAddress.line1}<br>
        ${data.shippingAddress.line2 ? data.shippingAddress.line2 + '<br>' : ''}
        ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
        ${data.shippingAddress.country}
      </p>
      
      <div class="divider"></div>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/merchant/orders" class="button">View Order Details</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `💰 New Order #${data.orderNumber} - ${data.merchantAmount} ${data.currency}`,
    html: baseTemplate(content),
  });
}

interface LowStockData {
  productName: string;
  currentStock: number;
  productId: string;
  storeName: string;
}

export async function sendLowStockAlert(to: string, data: LowStockData) {
  const isOutOfStock = data.currentStock === 0;
  
  const content = `
    <div class="content">
      ${isOutOfStock ? `
        <div class="alert" style="background: #fee2e2; border-color: #ef4444;">
          <p class="alert-text" style="color: #991b1b;">⚠️ SOLD OUT</p>
        </div>
      ` : `
        <div class="alert">
          <p class="alert-text">⚠️ Low Stock Warning</p>
        </div>
      `}
      
      <h1>${isOutOfStock ? 'Product Sold Out!' : 'Low Stock Alert'}</h1>
      <p>Your product in <span class="highlight">${data.storeName}</span> ${isOutOfStock ? 'is now sold out' : 'is running low on stock'}.</p>
      
      <div class="divider"></div>
      
      <div class="info-row">
        <span class="info-label">Product</span>
        <span class="info-value">${data.productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Current Stock</span>
        <span class="info-value" style="color: ${isOutOfStock ? '#ef4444' : '#f59e0b'};">${data.currentStock} items</span>
      </div>
      
      <div class="divider"></div>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/merchant/products" class="button">Update Inventory</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: isOutOfStock 
      ? `🚨 SOLD OUT: ${data.productName}` 
      : `⚠️ Low Stock: ${data.productName}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// ADMIN EMAILS
// ==========================================

export async function sendNewOrderToAdmin(to: string, data: NewOrderMerchantData & { customerEmail: string }) {
  const itemsHtml = data.items.map(item => `
    <div style="padding: 8px 0; border-bottom: 1px solid #374151;">
      <span>${item.name} × ${item.quantity}</span>
      <span style="float: right;">${item.price} ${data.currency}</span>
    </div>
  `).join('');

  const content = `
    <div class="content">
      <h1>New Platform Order 📊</h1>
      
      <div class="divider"></div>
      
      <div class="info-row">
        <span class="info-label">Order</span>
        <span class="info-value">#${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Store</span>
        <span class="info-value">${data.storeName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer</span>
        <span class="info-value">${data.customerEmail}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total</span>
        <span class="info-value">${data.subtotal} ${data.currency}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform Fee</span>
        <span class="info-value" style="color: #10b981;">${(parseFloat(data.subtotal) - parseFloat(data.merchantAmount)).toFixed(4)} ${data.currency}</span>
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #ffffff; font-weight: 600;">Items:</p>
      ${itemsHtml}
      
      <div class="divider"></div>
      
      <p style="color: #ffffff; font-weight: 600;">Ship to:</p>
      <p style="color: #9ca3af; font-size: 14px; margin: 0;">
        ${data.shippingAddress.name}<br>
        ${data.shippingAddress.line1}, ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[Admin] New Order #${data.orderNumber} - ${data.subtotal} ${data.currency}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// ADMIN APPROVAL NOTIFICATION EMAILS
// ==========================================

interface NewStoreSubmissionData {
  storeName: string;
  storeId: string;
  ownerWallet: string;
  description?: string;
}

export async function sendNewStoreSubmissionToAdmin(to: string, data: NewStoreSubmissionData) {
  const content = `
    <div class="content">
      <div class="alert" style="background: #dbeafe; border-color: #3b82f6;">
        <p class="alert-text" style="color: #1d4ed8;">🏪 New Store Application</p>
      </div>

      <h1>New Store Awaiting Approval</h1>
      <p>A new store application has been submitted and requires your review.</p>

      <div class="divider"></div>

      <div class="info-row">
        <span class="info-label">Store Name</span>
        <span class="info-value">${data.storeName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Owner Wallet</span>
        <span class="info-value" style="font-family: monospace; font-size: 12px;">${data.ownerWallet.slice(0, 8)}...${data.ownerWallet.slice(-8)}</span>
      </div>
      ${data.description ? `
      <div class="divider"></div>
      <p style="color: #ffffff; font-weight: 600;">Description:</p>
      <p style="color: #9ca3af;">${data.description}</p>
      ` : ''}

      <div class="divider"></div>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/stores/${data.storeId}" class="button">Review Store</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[Admin] New Store Application: ${data.storeName}`,
    html: baseTemplate(content),
  });
}

interface NewProductSubmissionData {
  productName: string;
  productId: string;
  storeName: string;
  storeSlug: string;
  merchantWallet: string;
  priceUsdc?: string;
  images?: string[];
}

export async function sendNewProductSubmissionToAdmin(to: string, data: NewProductSubmissionData) {
  const content = `
    <div class="content">
      <div class="alert" style="background: #dbeafe; border-color: #3b82f6;">
        <p class="alert-text" style="color: #1d4ed8;">📦 New Product Submission</p>
      </div>

      <h1>New Product Awaiting Approval</h1>
      <p>A new product has been submitted and requires your review.</p>

      <div class="divider"></div>

      ${data.images && data.images.length > 0 ? `
      <div style="text-align: center; margin-bottom: 16px;">
        <img src="${data.images[0]}" alt="${data.productName}" style="max-width: 200px; border-radius: 8px;">
      </div>
      ` : ''}

      <div class="info-row">
        <span class="info-label">Product</span>
        <span class="info-value">${data.productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Store</span>
        <span class="info-value">${data.storeName}</span>
      </div>
      ${data.priceUsdc ? `
      <div class="info-row">
        <span class="info-label">Price</span>
        <span class="info-value">$${data.priceUsdc} USDC</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Merchant Wallet</span>
        <span class="info-value" style="font-family: monospace; font-size: 12px;">${data.merchantWallet.slice(0, 8)}...${data.merchantWallet.slice(-8)}</span>
      </div>

      <div class="divider"></div>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/products" class="button">Review Products</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[Admin] New Product: ${data.productName} from ${data.storeName}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// STORE STATUS EMAILS
// ==========================================

export async function sendStoreApproved(to: string, storeName: string) {
  const content = `
    <div class="content">
      <h1>Your Store is Approved! 🎉</h1>
      <p>Congratulations! Your store <span class="highlight">${storeName}</span> has been approved.</p>
      <p>You can now start adding products and selling on ${PLATFORM_NAME}.</p>
      
      <div class="divider"></div>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/merchant/products" class="button">Add Your First Product</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `🎉 Store Approved: ${storeName}`,
    html: baseTemplate(content),
  });
}

export async function sendStoreRejected(to: string, storeName: string, reason: string) {
  const content = `
    <div class="content">
      <h1>Store Application Update</h1>
      <p>We've reviewed your store application for <span class="highlight">${storeName}</span>.</p>
      <p>Unfortunately, we're unable to approve your store at this time.</p>
      
      <div class="divider"></div>
      
      <p style="color: #ffffff; font-weight: 600;">Reason:</p>
      <p style="color: #f87171;">${reason}</p>
      
      <div class="divider"></div>
      
      <p>If you believe this was a mistake or have questions, please reach out to our support team.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Store Application Update: ${storeName}`,
    html: baseTemplate(content),
  });
}

export async function sendProductApproved(to: string, productName: string, storeName: string) {
  const content = `
    <div class="content">
      <h1>Product Approved! ✅</h1>
      <p>Your product <span class="highlight">${productName}</span> in ${storeName} has been approved and is now live!</p>
      
      <div class="divider"></div>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/merchant/products" class="button">View Products</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `✅ Product Approved: ${productName}`,
    html: baseTemplate(content),
  });
}

export async function sendProductRejected(to: string, productName: string, storeName: string, reason: string) {
  const content = `
    <div class="content">
      <h1>Product Review Update</h1>
      <p>Your product <span class="highlight">${productName}</span> in ${storeName} requires changes before it can be approved.</p>

      <div class="divider"></div>

      <p style="color: #ffffff; font-weight: 600;">Reason:</p>
      <p style="color: #f87171;">${reason}</p>

      <div class="divider"></div>

      <p>Please update your product and resubmit for review.</p>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/merchant/products" class="button">Edit Product</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Product Update Required: ${productName}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// PAYOUT EMAILS
// ==========================================

interface PayoutEmailData {
  amount: string;
  currency: string;
  orderCount: number;
  walletAddress: string;
  txSignature?: string;
  storeName: string;
}

export async function sendPayoutSent(to: string, data: PayoutEmailData) {
  const content = `
    <div class="content">
      <h1>Payout Sent! 💸</h1>
      <p>Great news! Your payout for <span class="highlight">${data.storeName}</span> has been sent.</p>

      <div class="divider"></div>

      <div class="info-row">
        <span class="info-label">Amount</span>
        <span class="info-value" style="color: #10b981; font-size: 20px; font-weight: bold;">${data.amount} ${data.currency}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Orders Included</span>
        <span class="info-value">${data.orderCount} orders</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sent To</span>
        <span class="info-value" style="font-family: monospace; font-size: 12px;">${data.walletAddress.slice(0, 8)}...${data.walletAddress.slice(-8)}</span>
      </div>
      ${data.txSignature ? `
      <div class="info-row">
        <span class="info-label">Transaction</span>
        <span class="info-value" style="font-family: monospace; font-size: 12px;">${data.txSignature.slice(0, 8)}...</span>
      </div>
      ` : ''}

      <div class="divider"></div>

      ${data.txSignature ? `
      <p style="text-align: center;">
        <a href="https://solscan.io/tx/${data.txSignature}" class="button">View on Solscan</a>
      </p>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Funds typically arrive within a few seconds on Solana.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `💸 Payout Sent: ${data.amount} ${data.currency}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// ORDER STATUS EMAILS
// ==========================================

interface OrderDeliveredData {
  orderNumber: string;
  customerName: string;
  storeName: string;
  deliveredAt: string;
}

export async function sendOrderDelivered(to: string, data: OrderDeliveredData) {
  const content = `
    <div class="content">
      <h1>Your Order Has Been Delivered! 🎉</h1>
      <p>Hi ${data.customerName}, your order from <span class="highlight">${data.storeName}</span> has been delivered!</p>

      <div class="divider"></div>

      <div class="info-row">
        <span class="info-label">Order</span>
        <span class="info-value">#${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Delivered</span>
        <span class="info-value">${data.deliveredAt}</span>
      </div>

      <div class="divider"></div>

      <p>Please confirm receipt of your order to release payment to the seller.</p>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/orders" class="button">Confirm Receipt</a>
      </p>

      <div class="divider"></div>

      <p style="color: #6b7280; font-size: 14px;">
        If you have any issues with your order, you can open a dispute within 14 days of delivery.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `🎉 Order Delivered - #${data.orderNumber}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// DISPUTE EMAILS
// ==========================================

interface DisputeEmailData {
  orderNumber: string;
  reason: string;
  customerName: string;
  customerEmail: string;
  storeName: string;
  amount: string;
  currency: string;
}

export async function sendDisputeOpenedToMerchant(to: string, data: DisputeEmailData) {
  const content = `
    <div class="content">
      <div class="alert" style="background: #fee2e2; border-color: #ef4444;">
        <p class="alert-text" style="color: #991b1b;">⚠️ Dispute Opened</p>
      </div>

      <h1>A Buyer Has Opened a Dispute</h1>
      <p>A dispute has been opened for an order from <span class="highlight">${data.storeName}</span>.</p>

      <div class="divider"></div>

      <div class="info-row">
        <span class="info-label">Order</span>
        <span class="info-value">#${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer</span>
        <span class="info-value">${data.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Amount</span>
        <span class="info-value">${data.amount} ${data.currency}</span>
      </div>

      <div class="divider"></div>

      <p style="color: #ffffff; font-weight: 600;">Dispute Reason:</p>
      <p style="color: #f87171; background: #1f2937; padding: 16px; border-radius: 8px;">${data.reason}</p>

      <div class="divider"></div>

      <p>Please contact the buyer at <a href="mailto:${data.customerEmail}" style="color: #3b82f6;">${data.customerEmail}</a> to resolve this issue.</p>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/merchant/orders" class="button">View Order</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `⚠️ Dispute Opened - Order #${data.orderNumber}`,
    html: baseTemplate(content),
  });
}

export async function sendDisputeOpenedToAdmin(to: string, data: DisputeEmailData & { merchantEmail: string }) {
  const content = `
    <div class="content">
      <div class="alert" style="background: #fee2e2; border-color: #ef4444;">
        <p class="alert-text" style="color: #991b1b;">⚠️ New Dispute - Admin Action Required</p>
      </div>

      <h1>Dispute Opened</h1>

      <div class="divider"></div>

      <div class="info-row">
        <span class="info-label">Order</span>
        <span class="info-value">#${data.orderNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Store</span>
        <span class="info-value">${data.storeName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Amount</span>
        <span class="info-value">${data.amount} ${data.currency}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Buyer</span>
        <span class="info-value">${data.customerEmail}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Seller</span>
        <span class="info-value">${data.merchantEmail}</span>
      </div>

      <div class="divider"></div>

      <p style="color: #ffffff; font-weight: 600;">Dispute Reason:</p>
      <p style="color: #f87171; background: #1f2937; padding: 16px; border-radius: 8px;">${data.reason}</p>

      <div class="divider"></div>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders" class="button">Review in Admin</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[ADMIN] Dispute - Order #${data.orderNumber} - ${data.amount} ${data.currency}`,
    html: baseTemplate(content),
  });
}

export async function sendDisputeResolved(to: string, data: { orderNumber: string; resolution: string; customerName: string }) {
  const content = `
    <div class="content">
      <h1>Dispute Resolved ✅</h1>
      <p>Hi ${data.customerName}, your dispute for order <span class="highlight">#${data.orderNumber}</span> has been resolved.</p>

      <div class="divider"></div>

      <p style="color: #ffffff; font-weight: 600;">Resolution:</p>
      <p style="background: #1f2937; padding: 16px; border-radius: 8px;">${data.resolution}</p>

      <div class="divider"></div>

      <p>Thank you for your patience. If you have any further questions, please contact support.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Dispute Resolved - Order #${data.orderNumber}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// MESSAGE NOTIFICATION EMAILS
// ==========================================

interface MessageNotificationData {
  senderName: string;
  senderRole: 'ADMIN' | 'MERCHANT' | 'CUSTOMER';
  storeName?: string;
  messagePreview: string;
  recipientName?: string;
  dashboardUrl: string;
}

export async function sendNewMessageNotification(to: string, data: MessageNotificationData) {
  const senderTitle = data.senderRole === 'ADMIN'
    ? 'Platform Admin'
    : data.senderRole === 'MERCHANT'
    ? `${data.storeName || 'Merchant'}`
    : 'Customer';

  const content = `
    <div class="content">
      <h1>New Message 💬</h1>
      <p>${data.recipientName ? `Hi ${data.recipientName}, ` : ''}You have a new message from <span class="highlight">${senderTitle}</span>.</p>

      <div class="divider"></div>

      <div style="background: #1f2937; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">From: ${data.senderName || senderTitle}</p>
        <p style="color: #ffffff; margin: 0;">${data.messagePreview.slice(0, 200)}${data.messagePreview.length > 200 ? '...' : ''}</p>
      </div>

      <div class="divider"></div>

      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">View Message</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `New Message from ${senderTitle}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// ABANDONED CART EMAILS
// ==========================================

interface AbandonedCartItem {
  name: string;
  image?: string;
  price: string;
  quantity: number;
}

interface AbandonedCartData {
  customerName: string;
  items: AbandonedCartItem[];
  totalValue: string;
  currency: string;
}

export async function sendAbandonedCartReminder(to: string, data: AbandonedCartData) {
  const itemsHtml = data.items.slice(0, 3).map(item => `
    <div class="product-item">
      ${item.image ? `<img src="${item.image}" alt="${item.name}" class="product-image">` : ''}
      <div class="product-details">
        <div class="product-name">${item.name}</div>
        <div class="product-variant">Qty: ${item.quantity}</div>
      </div>
      <div class="product-price">${item.price} ${data.currency}</div>
    </div>
  `).join('');

  const moreItems = data.items.length > 3 ? `<p style="color: #6b7280; text-align: center;">+ ${data.items.length - 3} more items</p>` : '';

  const content = `
    <div class="content">
      <h1>You left something behind!</h1>
      <p>Hi ${data.customerName}, you have items waiting in your cart.</p>

      <div class="divider"></div>

      ${itemsHtml}
      ${moreItems}

      <div class="total-row">
        <span>Cart Total</span>
        <span>${data.totalValue} ${data.currency}</span>
      </div>

      <div class="divider"></div>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout" class="button">Complete Your Purchase</a>
      </p>

      <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 16px;">
        Items in your cart are not reserved and may sell out.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Your cart is waiting - ${data.totalValue} ${data.currency}`,
    html: baseTemplate(content),
  });
}

// ==========================================
// REVIEW REQUEST EMAIL
// ==========================================

interface ReviewRequestData {
  customerName: string;
  orderNumber: string;
  products: { name: string; image?: string; slug: string }[];
  storeName: string;
}

export async function sendReviewRequest(to: string, data: ReviewRequestData) {
  const productsHtml = data.products.slice(0, 3).map(product => `
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #374151;">
      ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">` : ''}
      <div style="flex: 1;">
        <div style="color: #ffffff; font-weight: 500;">${product.name}</div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/product/${product.slug}?review=true" style="color: #3b82f6; font-size: 14px; text-decoration: none;">Leave Review</a>
    </div>
  `).join('');

  const content = `
    <div class="content">
      <h1>How was your order?</h1>
      <p>Hi ${data.customerName}, we hope you're enjoying your purchase from <span class="highlight">${data.storeName}</span>!</p>
      <p>Your feedback helps other shoppers and supports the seller.</p>

      <div class="divider"></div>

      <p style="color: #6b7280; font-size: 14px;">Order #${data.orderNumber}</p>

      ${productsHtml}

      <div class="divider"></div>

      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/orders" class="button">Review Your Order</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `How was your order from ${data.storeName}?`,
    html: baseTemplate(content),
  });
}
