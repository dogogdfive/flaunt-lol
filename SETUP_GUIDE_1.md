# 🚀 Store.lol Platform - Setup Guide

This guide will walk you through setting up your own "Shopify for Crypto" platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Super Admin Setup](#super-admin-setup)
6. [Privy Authentication Setup](#privy-authentication)
7. [Solana Pay Setup](#solana-pay-setup)
8. [Running the Platform](#running-the-platform)
9. [Deployment](#deployment)

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed
- **PostgreSQL** database (local or hosted like Supabase/Railway)
- **Solana Wallet** (Phantom, Solflare, etc.)
- **Privy Account** (free at https://privy.io)
- **Code Editor** (VS Code recommended)

---

## Project Setup

### 1. Install Dependencies

```bash
cd store-fun-platform
npm install
```

### 2. Generate Prisma Client

```bash
npm run db:generate
```

---

## Database Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database:

```bash
createdb storefun
```

3. Set your DATABASE_URL:

```
DATABASE_URL="postgresql://username:password@localhost:5432/storefun"
```

### Option B: Supabase (Recommended for beginners)

1. Go to https://supabase.com and create a new project
2. Go to Settings → Database → Connection string
3. Copy the connection string and add to `.env.local`

### Option C: Railway

1. Go to https://railway.app
2. Create new project → Add PostgreSQL
3. Copy the connection string from Variables tab

### Push Schema to Database

```bash
npm run db:push
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/storefun"

# Privy (get from https://dashboard.privy.io)
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
PRIVY_APP_SECRET="your-privy-secret"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
# For testing, use devnet:
# SOLANA_RPC_URL="https://api.devnet.solana.com"

# Platform Wallet (your main wallet that receives payments)
NEXT_PUBLIC_PLATFORM_WALLET="YourSolanaWalletPublicKey"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🔐 Super Admin Setup

This is the most important part! Here's how to make yourself the super admin:

### Method 1: Using the Seed Script (Recommended)

1. **Open `prisma/seed.ts`**

2. **Replace the wallet address** with YOUR Solana wallet address:

```typescript
const superAdmin = await prisma.user.upsert({
  where: { walletAddress: 'YOUR_ACTUAL_WALLET_ADDRESS' }, // <-- Put your wallet here!
  update: {
    role: 'SUPER_ADMIN',
  },
  create: {
    walletAddress: 'YOUR_ACTUAL_WALLET_ADDRESS', // <-- And here!
    email: 'your-email@example.com', // Optional
    name: 'Your Name',
    role: 'SUPER_ADMIN',
    isVerified: true,
  },
});
```

3. **Run the seed script:**

```bash
npm run db:seed
```

4. **Verify in Prisma Studio:**

```bash
npm run db:studio
```

Look at the `users` table - you should see your wallet with `SUPER_ADMIN` role.

### Method 2: Direct Database Update

If you've already logged in with your wallet and want to upgrade your account:

1. Open Prisma Studio:

```bash
npm run db:studio
```

2. Go to the `User` table
3. Find your account (by wallet address)
4. Change `role` from `CUSTOMER` to `SUPER_ADMIN`
5. Save

### Method 3: SQL Query

Run this SQL in your database:

```sql
UPDATE users 
SET role = 'SUPER_ADMIN' 
WHERE wallet_address = 'YourWalletAddressHere';
```

---

## Privy Authentication

Privy handles wallet connection and email login.

### 1. Create Privy Account

1. Go to https://dashboard.privy.io
2. Sign up and create a new app
3. Copy your **App ID** and **App Secret**

### 2. Configure Privy

In Privy Dashboard:

1. Go to **Login Methods**
2. Enable:
   - ✅ Wallet (Solana)
   - ✅ Email (optional)
   - ✅ Google (optional)

3. Go to **Appearance** and customize the login modal

4. Go to **Allowed Domains** and add:
   - `localhost:3000` (for development)
   - Your production domain

### 3. Add to Environment

```env
NEXT_PUBLIC_PRIVY_APP_ID="your-app-id"
PRIVY_APP_SECRET="your-secret"
```

---

## Solana Pay Setup

### 1. Create Platform Wallet

This wallet will receive all customer payments:

1. Create a new Solana wallet (use Phantom or Solflare)
2. **IMPORTANT:** Save the private key securely!
3. Add the public key to `.env.local`:

```env
NEXT_PUBLIC_PLATFORM_WALLET="YourPlatformWalletPublicKey"
```

### 2. For Payouts (Optional but recommended)

To process automatic payouts to merchants, you need the private key:

1. Export your wallet's private key
2. Convert to base64
3. Add to environment:

```env
PLATFORM_WALLET_PRIVATE_KEY="base64-encoded-private-key"
```

⚠️ **Security Warning:** In production, use a secure vault like AWS Secrets Manager or HashiCorp Vault for private keys.

### 3. Helius RPC (Recommended for Production)

Free tier: https://helius.dev

```env
SOLANA_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY"
```

Benefits:
- Faster transactions
- Webhooks for payment verification
- Better uptime than public RPC

---

## Running the Platform

### Development Mode

```bash
npm run dev
```

Open http://localhost:3000

### Available Routes

| Route | Description |
|-------|-------------|
| `/` | Store homepage |
| `/merchant/dashboard` | Merchant dashboard |
| `/admin` | Admin portal |
| `/login` | Login page |

---

## Role-Based Access

The platform has 4 user roles:

| Role | Access |
|------|--------|
| `CUSTOMER` | Browse, purchase products |
| `MERCHANT` | All customer access + manage store, products, orders |
| `ADMIN` | All merchant access + approve stores/products, process payouts |
| `SUPER_ADMIN` | All admin access + manage admins, platform settings |

### Promoting Users

**As Super Admin, you can promote users:**

1. Go to Admin Portal → Users
2. Find the user
3. Click "Change Role"
4. Select new role

**Or via API:**

```typescript
// In an API route or server action
import { promoteToAdmin, promoteToMerchant } from '@/lib/auth';

// Make someone an admin (requires super admin)
await promoteToAdmin(userId, currentUserId);

// Make someone a merchant (any admin can do this)
await promoteToMerchant(userId);
```

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables
5. Deploy!

### Environment Variables for Production

Make sure to set these in Vercel:

```
DATABASE_URL
NEXT_PUBLIC_PRIVY_APP_ID
PRIVY_APP_SECRET
SOLANA_RPC_URL
NEXT_PUBLIC_PLATFORM_WALLET
PLATFORM_WALLET_PRIVATE_KEY
NEXT_PUBLIC_APP_URL
```

---

## Common Issues

### "Unauthorized" when accessing admin

- Make sure your wallet is set as SUPER_ADMIN in the database
- Clear cookies and re-login

### Payments not processing

- Check SOLANA_RPC_URL is correct
- Verify PLATFORM_WALLET is valid
- Check transaction on Solscan

### Database connection errors

- Verify DATABASE_URL is correct
- Check if database is running
- Run `npm run db:push` if schema changed

---

## Next Steps

1. ✅ Set up your super admin account
2. ✅ Configure Privy
3. ✅ Set up Solana wallet
4. 📦 Add your first test product
5. 💰 Test a payment (use devnet first!)
6. 🚀 Deploy to production

---

## Need Help?

- Check the `PLATFORM_ARCHITECTURE.md` for detailed technical docs
- Review the API routes in `app/api/`
- Look at the Prisma schema in `prisma/schema.prisma`

---

*Happy building! 🎉*
