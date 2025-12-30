// lib/auth.ts
// Authentication and authorization helpers

import { cookies, headers } from 'next/headers';
import prisma from './prisma';
import type { UserRole, User } from '@/types';

// Secret super admin wallets - these can demote other super admins and cannot be demoted
const SECRET_SUPER_ADMIN_WALLETS = [
  '6wdzyy', // 6wdzyy...ZxxV - partial match start
  'F2PHTW', // F2PHTW...SKru - partial match start
];

// Check if wallet is a secret super admin (matches start of address)
export function isSecretSuperAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return SECRET_SUPER_ADMIN_WALLETS.some(prefix => walletAddress.startsWith(prefix));
}

// ==========================================
// GET CURRENT USER
// ==========================================

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get wallet address from headers (sent by client)
    const headersList = headers();
    const walletAddress = headersList.get('x-wallet-address');

    if (!walletAddress) {
      return null;
    }

    // Get user from database by wallet address
    let user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) {
      // Create new user if doesn't exist
      console.log('[Auth] Creating new user with wallet:', walletAddress);
      const newUser = await prisma.user.create({
        data: {
          walletAddress,
          role: 'CUSTOMER',
        },
      });
      return newUser as User;
    }

    return user as User;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// ==========================================
// ROLE CHECKING HELPERS
// ==========================================

export function isAdmin(user: User | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
}

export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export function isMerchant(user: User | null): boolean {
  return user?.role === 'MERCHANT' || isAdmin(user);
}

export function hasRole(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// ==========================================
// REQUIRE AUTH HELPERS (for API routes)
// ==========================================

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  if (user.isBanned) {
    throw new Error('Account banned');
  }
  
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();

  // Secret super admins always have admin access
  if (isSecretSuperAdmin(user.walletAddress)) {
    // Auto-promote to SUPER_ADMIN if not already
    if (user.role !== 'SUPER_ADMIN') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' },
      });
      user.role = 'SUPER_ADMIN';
    }
    return user;
  }

  // Check by role OR by wallet address
  const adminWallets = (process.env.ADMIN_WALLETS || '').split(',').map(w => w.trim().toLowerCase());
  const userWalletLower = user.walletAddress?.toLowerCase();
  const isAdminWallet = userWalletLower && adminWallets.includes(userWalletLower);

  console.log('[Auth] Admin check:', {
    userId: user.id,
    userWallet: user.walletAddress,
    userRole: user.role,
    isAdminByRole: isAdmin(user),
    isAdminByWallet: isAdminWallet,
    configuredAdminWallets: adminWallets,
  });

  if (!isAdmin(user) && !isAdminWallet) {
    throw new Error('Admin access required');
  }

  return user;
}

export async function requireSuperAdmin(): Promise<User> {
  const user = await requireAuth();

  // Secret super admins always have super admin access
  if (isSecretSuperAdmin(user.walletAddress)) {
    // Auto-promote to SUPER_ADMIN if not already
    if (user.role !== 'SUPER_ADMIN') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' },
      });
      user.role = 'SUPER_ADMIN';
    }
    return user;
  }

  if (!isSuperAdmin(user)) {
    throw new Error('Super Admin access required');
  }

  return user;
}

export async function requireMerchant(): Promise<User> {
  const user = await requireAuth();
  
  if (!isMerchant(user)) {
    throw new Error('Merchant access required');
  }
  
  return user;
}

// ==========================================
// PROMOTE/DEMOTE USERS (Super Admin only)
// ==========================================

export async function promoteToAdmin(userId: string, promoterId: string): Promise<void> {
  const promoter = await prisma.user.findUnique({ where: { id: promoterId } });
  
  if (promoter?.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can promote users');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: 'ADMIN' },
  });
}

export async function promoteToMerchant(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'MERCHANT' },
  });
}

export async function demoteToCustomer(userId: string, demoterId: string): Promise<void> {
  const demoter = await prisma.user.findUnique({ where: { id: demoterId } });
  const target = await prisma.user.findUnique({ where: { id: userId } });

  // Secret super admins cannot be demoted
  if (isSecretSuperAdmin(target?.walletAddress)) {
    throw new Error('Cannot demote this user');
  }

  // Only secret super admins can demote other super admins
  if (target?.role === 'SUPER_ADMIN') {
    if (!isSecretSuperAdmin(demoter?.walletAddress)) {
      throw new Error('Cannot demote Super Admin');
    }
  }

  // Only super admins can demote admins
  if (target?.role === 'ADMIN' && demoter?.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can demote Admins');
  }

  // Can't demote yourself
  if (userId === demoterId) {
    throw new Error('Cannot demote yourself');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: 'CUSTOMER' },
  });
}

// ==========================================
// BAN/UNBAN USERS
// ==========================================

export async function banUser(userId: string, reason: string, adminId: string): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  const target = await prisma.user.findUnique({ where: { id: userId } });

  if (!isAdmin(admin as User)) {
    throw new Error('Admin access required');
  }

  // Secret super admins cannot be banned
  if (isSecretSuperAdmin(target?.walletAddress)) {
    throw new Error('Cannot ban this user');
  }

  if (isAdmin(target as User) && !isSuperAdmin(admin as User)) {
    throw new Error('Only Super Admin can ban Admins');
  }

  if (target?.role === 'SUPER_ADMIN') {
    throw new Error('Cannot ban Super Admin');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      bannedReason: reason,
    },
  });
}

export async function unbanUser(userId: string, adminId: string): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });

  if (!isAdmin(admin as User)) {
    throw new Error('Admin access required');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: false,
      bannedReason: null,
    },
  });
}