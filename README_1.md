# 🛒 Store.lol - Crypto Commerce Platform
## "Shopify for Solana"

A complete e-commerce platform where merchants sell products and customers pay with crypto (SOL/USDC).

---

## 📦 What's Included

```
store-fun-platform/
├── 🎨 Frontend
│   ├── app/page.tsx                    # Homepage (fetches approved products)
│   ├── app/(merchant)/merchant/        # Merchant Dashboard
│   │   ├── dashboard/                  # Stats & overview
│   │   ├── products/                   # Manage products
│   │   ├── orders/                     # Fulfill orders
│   │   └── payouts/                    # View earnings
│   └── store-fun-complete.html         # Static preview
│
├── 🔌 API Routes
│   ├── /api/products                   # Public - get approved products
│   ├── /api/products/[id]              # Public - single product (for live updates)
│   ├── /api/merchant/products          # Merchant - upload products
│   ├── /api/payments/create            # Create Solana Pay request
│   ├── /api/admin/products/[id]/approve
│   ├── /api/admin/products/[id]/reject
│   ├── /api/admin/stores/[id]/approve
│   ├── /api/admin/stores/[id]/reject
│   └── /api/admin/users/[id]/role      # Change user roles
│
├── 🗄️ Database
│   ├── prisma/schema.prisma            # All tables defined
│   └── prisma/seed.ts                  # Creates your Super Admin
│
├── 💰 Payments
│   └── lib/solana-pay.ts               # Solana Pay + payouts
│
├── 🔐 Auth
│   └── lib/auth.ts                     # Role-based access control
│
└── 📄 Docs
    ├── SETUP_GUIDE.md                  # Detailed setup instructions
    └── PLATFORM_ARCHITECTURE.md        # Technical documentation
```

**Bonus Files:**
- `admin-portal.html` - Standalone admin dashboard preview
- `store-fun-complete.html` - Standalone storefront preview

---

## 🚀 SETUP STEPS

### Step 1: Extract & Install

```bash
# Unzip the project
unzip store-fun-platform.zip
cd store-fun-platform

# Install dependencies
npm install
```

---

### Step 2: Set Up Database

**Option A: Supabase (Easiest)**
1. Go to https://supabase.com → Create project
2. Go to Settings → Database → Connection string
3. Copy the URI

**Option B: Railway**
1. Go to https://railway.app → New Project → Add PostgreSQL
2. Copy connection string from Variables

---

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database (from Step 2)
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Privy - Get from https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
PRIVY_APP_SECRET="your-privy-secret"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Your platform wallet (receives all payments)
NEXT_PUBLIC_PLATFORM_WALLET="YourSolanaWalletPublicKey"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

### Step 4: Set Up Super Admin (IMPORTANT!)

1. Open `prisma/seed.ts`

2. Find this section and add YOUR wallet address:

```typescript
const superAdmin = await prisma.user.upsert({
  where: { walletAddress: 'YOUR_WALLET_ADDRESS_HERE' }, // ← YOUR WALLET
  update: { role: 'SUPER_ADMIN' },
  create: {
    walletAddress: 'YOUR_WALLET_ADDRESS_HERE',          // ← YOUR WALLET
    email: 'your@email.com',
    name: 'Your Name',
    role: 'SUPER_ADMIN',
    isVerified: true,
  },
});
```

3. Push database & seed:

```bash
npm run db:push      # Create tables
npm run db:seed      # Create your Super Admin account
```

4. Verify it worked:

```bash
npm run db:studio    # Opens database GUI
```

Look at `users` table → Your wallet should have `SUPER_ADMIN` role ✓

---

### Step 5: Set Up Privy Authentication

1. Go to https://dashboard.privy.io
2. Create new app
3. Enable login methods:
   - ✅ Wallet (Solana)
   - ✅ Email (optional)
4. Add allowed domains:
   - `localhost:3000`
   - Your production domain
5. Copy App ID & Secret to `.env.local`

---

### Step 6: Run the Platform

```bash
npm run dev
```

Open http://localhost:3000

---

## 🔐 USER ROLES

| Role | Permissions |
|------|-------------|
| **CUSTOMER** | Browse, buy products |
| **MERCHANT** | + Manage store, upload products, fulfill orders |
| **ADMIN** | + Approve/reject stores & products, process payouts |
| **SUPER_ADMIN** | + Manage admins, platform settings, ban users |

---

## 📋 PRODUCT APPROVAL FLOW

```
Merchant uploads product
        ↓
    Status: PENDING
        ↓
Admin reviews in Admin Portal
        ↓
   ┌────────────┐
   │  APPROVED  │ → Shows on homepage
   │  REJECTED  │ → Merchant notified
   └────────────┘
```

**Key:** Products are ONLY visible on homepage if `status = APPROVED`

---

## 💰 PAYMENT FLOW

```
Customer clicks "Buy"
        ↓
Solana Pay QR/request generated
        ↓
Customer pays (SOL or USDC)
        ↓
Payment verified on-chain
        ↓
Order created, inventory updated
        ↓
Bonding curve updates (live!)
        ↓
After 7 days → Payout to merchant (minus 3.5% fee)
```

---

## 🔄 LIVE BONDING CURVE

The bonding curve updates automatically:

1. Customer buys product → `bondingCurrent` increments in database
2. Frontend polls `/api/products/[id]` every 10 seconds
3. Progress bar animates to new value

---

## 📱 AVAILABLE ROUTES

| Route | Who | Description |
|-------|-----|-------------|
| `/` | Public | Homepage with approved products |
| `/merchant/dashboard` | Merchant | Sales overview |
| `/merchant/products` | Merchant | Manage products |
| `/merchant/orders` | Merchant | Fulfill orders |
| `/merchant/payouts` | Merchant | View earnings |
| `/admin` | Admin | Admin portal |

---

## 🛠️ USEFUL COMMANDS

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema to database
npm run db:seed      # Run seed script
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## 🚢 DEPLOYMENT

### Vercel (Recommended)

1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production

```
DATABASE_URL
NEXT_PUBLIC_PRIVY_APP_ID
PRIVY_APP_SECRET
SOLANA_RPC_URL
NEXT_PUBLIC_PLATFORM_WALLET
NEXT_PUBLIC_APP_URL
```

---

## 💵 COSTS

| Service | Monthly |
|---------|---------|
| Vercel | $0-20 |
| Supabase/Railway | $0-25 |
| Helius RPC | $0-50 |
| Privy | Free tier |
| **Total** | **~$0-100/mo** |

---

## ❓ TROUBLESHOOTING

**"Unauthorized" on admin page**
- Check your wallet is set as SUPER_ADMIN in database
- Clear cookies and re-login

**Products not showing**
- Check product status is `APPROVED`
- Check store status is `APPROVED`

**Payments not working**
- Verify `NEXT_PUBLIC_PLATFORM_WALLET` is correct
- Check Solana RPC URL is valid
- For testing, use devnet first

**Database errors**
- Run `npm run db:push` to sync schema
- Check `DATABASE_URL` is correct

---

## 📞 QUICK REFERENCE

**Make yourself Super Admin:**
```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE wallet_address = 'YourWallet';
```

**Approve a product via API:**
```bash
POST /api/admin/products/{id}/approve
```

**Reject a product:**
```bash
POST /api/admin/products/{id}/reject
Body: { "reason": "Low quality images" }
```

---

Built with ❤️ for the Solana ecosystem
