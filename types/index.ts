// types/index.ts
// Shared TypeScript types for the platform

export type UserRole = 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | 'SUPER_ADMIN';
export type StoreStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type ProductStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type PaymentCurrency = 'SOL' | 'USDC';

// User
export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  role: UserRole;
  name?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: Date;
}

// Store
export interface Store {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  status: StoreStatus;
  payoutWallet?: string;
  themeColor: string;
  isVerified: boolean;
  totalSales: number;
  totalOrders: number;
  createdAt: Date;
}

// Product
export interface Product {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description?: string;
  priceSol: number;
  priceUsdc?: number;
  status: ProductStatus;
  quantity: number;
  images: string[];
  category?: string;
  bondingEnabled: boolean;
  bondingGoal: number;
  bondingCurrent: number;
  totalSold: number;
  createdAt: Date;
}

// Order
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentCurrency: PaymentCurrency;
  subtotal: number;
  platformFee: number;
  merchantAmount: number;
  paymentTx?: string;
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  createdAt: Date;
  paidAt?: Date;
}

// Shipping Address
export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// Payout
export interface Payout {
  id: string;
  storeId: string;
  amount: number;
  currency: PaymentCurrency;
  status: PayoutStatus;
  walletAddress: string;
  txSignature?: string;
  orderCount: number;
  createdAt: Date;
  completedAt?: Date;
}

// Cart Item
export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  product: Product;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  pendingPayouts: number;
}

// Platform Settings
export interface PlatformSettings {
  platformFeePercent: number;
  minPayoutSol: number;
  minPayoutUsdc: number;
  payoutHoldDays: number;
  autoPayoutEnabled: boolean;
  autoPayoutSchedule: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  platformWallet: string;
}

// Solana Pay
export interface PaymentRequest {
  recipient: string;
  amount: number;
  splToken?: string; // USDC mint address
  reference: string;
  label: string;
  message: string;
  memo?: string;
}
