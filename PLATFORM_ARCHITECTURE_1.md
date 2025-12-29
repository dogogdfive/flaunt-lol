# 🏪 Crypto Commerce Platform - System Architecture
## "Shopify for Solana"

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Database Schema](#database-schema)
4. [Feature Modules](#feature-modules)
5. [Payment Flow](#payment-flow)
6. [Tech Stack](#tech-stack)
7. [API Endpoints](#api-endpoints)
8. [Admin Portal](#admin-portal)
9. [Security Considerations](#security-considerations)
10. [Development Roadmap](#development-roadmap)

---

## 🎯 Overview

A decentralized e-commerce platform where:
- **Merchants** can create stores and sell physical/digital products
- **Customers** pay with crypto (SOL, USDC)
- **Platform** handles payments, takes fees, and pays out merchants
- **Admins** review/approve stores and products before going live

### Revenue Model
- Platform fee: 2-5% per transaction
- Optional premium features (custom domains, analytics, etc.)
- Store setup fee (optional)

---

## 👥 User Roles & Permissions

### 1. Customer
```
- Browse stores/products
- Add to cart
- Checkout with crypto wallet
- View order history
- Leave reviews
- Track shipments
```

### 2. Merchant (Store Owner)
```
- Apply to create store
- Upload products (pending approval)
- Manage inventory
- View orders
- Fulfill orders (mark shipped)
- View earnings/payouts
- Customize store appearance
- Connect payout wallet
```

### 3. Admin
```
- Review store applications
- Approve/reject products
- Manage all orders
- Process payouts
- Handle disputes
- View platform analytics
- Manage users (ban/suspend)
```

### 4. Super Admin
```
- All admin permissions
- Manage admin accounts
- Platform settings
- Fee configuration
- Access financial reports
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE,
  wallet_address  VARCHAR(44) UNIQUE,  -- Solana wallet
  role            ENUM('customer', 'merchant', 'admin', 'super_admin'),
  name            VARCHAR(255),
  avatar_url      TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  is_verified     BOOLEAN DEFAULT FALSE,
  is_banned       BOOLEAN DEFAULT FALSE
);
```

### Stores Table
```sql
CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,  -- URL-friendly name
  description     TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  status          ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  payout_wallet   VARCHAR(44),  -- Solana wallet for payouts
  
  -- Store settings
  theme_color     VARCHAR(7) DEFAULT '#3b82f6',
  custom_domain   VARCHAR(255),
  
  -- Verification
  verified        BOOLEAN DEFAULT FALSE,
  verified_at     TIMESTAMP,
  
  -- Stats
  total_sales     DECIMAL(20, 9) DEFAULT 0,
  total_orders    INTEGER DEFAULT 0,
  
  -- Metadata
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  approved_at     TIMESTAMP,
  approved_by     UUID REFERENCES users(id)
);
```

### Products Table
```sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID REFERENCES stores(id),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  price_sol       DECIMAL(20, 9),  -- Price in SOL
  price_usdc      DECIMAL(20, 6),  -- Price in USDC
  
  -- Status
  status          ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft',
  rejection_reason TEXT,
  
  -- Inventory
  quantity        INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT TRUE,
  
  -- Product type
  product_type    ENUM('physical', 'digital') DEFAULT 'physical',
  digital_file_url TEXT,  -- For digital products
  
  -- Shipping (physical products)
  weight_grams    INTEGER,
  requires_shipping BOOLEAN DEFAULT TRUE,
  
  -- Media
  images          JSONB DEFAULT '[]',  -- Array of image URLs
  
  -- SEO
  slug            VARCHAR(255),
  
  -- Bonding curve (like store.lol)
  bonding_enabled BOOLEAN DEFAULT FALSE,
  bonding_goal    INTEGER DEFAULT 100,
  bonding_current INTEGER DEFAULT 0,
  
  -- Stats
  total_sold      INTEGER DEFAULT 0,
  
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Product Variants Table
```sql
CREATE TABLE product_variants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID REFERENCES products(id),
  name            VARCHAR(255),  -- e.g., "Large / Black"
  sku             VARCHAR(100),
  price_sol       DECIMAL(20, 9),
  price_usdc      DECIMAL(20, 6),
  quantity        INTEGER DEFAULT 0,
  options         JSONB,  -- {"size": "L", "color": "Black"}
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    VARCHAR(20) UNIQUE,  -- Human-readable order number
  customer_id     UUID REFERENCES users(id),
  store_id        UUID REFERENCES stores(id),
  
  -- Status
  status          ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
  
  -- Payment
  payment_status  ENUM('pending', 'completed', 'failed', 'refunded'),
  payment_currency ENUM('SOL', 'USDC'),
  subtotal        DECIMAL(20, 9),
  platform_fee    DECIMAL(20, 9),
  merchant_amount DECIMAL(20, 9),  -- Amount merchant receives
  
  -- Blockchain
  payment_tx      VARCHAR(88),  -- Solana transaction signature
  payout_tx       VARCHAR(88),  -- Payout to merchant tx
  
  -- Shipping
  shipping_address JSONB,
  tracking_number VARCHAR(100),
  tracking_url    TEXT,
  shipped_at      TIMESTAMP,
  delivered_at    TIMESTAMP,
  
  -- Metadata
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  paid_at         TIMESTAMP
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES orders(id),
  product_id      UUID REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  quantity        INTEGER NOT NULL,
  price           DECIMAL(20, 9) NOT NULL,
  currency        ENUM('SOL', 'USDC'),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Payouts Table
```sql
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID REFERENCES stores(id),
  amount          DECIMAL(20, 9) NOT NULL,
  currency        ENUM('SOL', 'USDC'),
  status          ENUM('pending', 'processing', 'completed', 'failed'),
  wallet_address  VARCHAR(44),
  tx_signature    VARCHAR(88),
  
  -- Period
  period_start    TIMESTAMP,
  period_end      TIMESTAMP,
  
  -- Included orders
  orders          JSONB,  -- Array of order IDs
  
  created_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP
);
```

### Store Applications Table
```sql
CREATE TABLE store_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id),
  store_name      VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),
  website_url     TEXT,
  social_links    JSONB,
  
  -- Application details
  business_type   ENUM('individual', 'business'),
  country         VARCHAR(2),
  
  -- Review
  status          ENUM('pending', 'approved', 'rejected', 'more_info_needed'),
  reviewer_id     UUID REFERENCES users(id),
  reviewer_notes  TEXT,
  rejection_reason TEXT,
  
  created_at      TIMESTAMP DEFAULT NOW(),
  reviewed_at     TIMESTAMP
);
```

### Platform Settings Table
```sql
CREATE TABLE platform_settings (
  key             VARCHAR(100) PRIMARY KEY,
  value           JSONB,
  updated_at      TIMESTAMP DEFAULT NOW(),
  updated_by      UUID REFERENCES users(id)
);

-- Example settings:
-- platform_fee_percent: 3.5
-- min_payout_sol: 0.1
-- min_payout_usdc: 10
-- auto_payout_enabled: true
-- auto_payout_threshold: 100
```

---

## 🔧 Feature Modules

### Module 1: Merchant Onboarding

**Flow:**
```
1. User connects wallet (Privy)
2. User clicks "Launch Store"
3. Fill out application form:
   - Store name
   - Description
   - Category
   - Social links
   - Business type
4. Submit for review
5. Admin reviews application
6. If approved → Store created, merchant notified
7. If rejected → Merchant notified with reason
```

**Application Form Fields:**
- Store name*
- Store description*
- Category (Apparel, Art, Collectibles, etc.)
- Website/social links
- Sample products (images)
- Payout wallet address*
- Country*
- Agree to terms*

### Module 2: Product Upload

**Flow:**
```
1. Merchant goes to dashboard
2. Click "Add Product"
3. Fill product details:
   - Name, description
   - Price (SOL/USDC)
   - Images (up to 10)
   - Category
   - Variants (optional)
   - Inventory quantity
4. Save as draft or submit for review
5. Admin reviews product
6. If approved → Goes live
7. If rejected → Merchant can edit and resubmit
```

**Product Form Fields:**
- Product name*
- Description*
- Price (SOL)*
- Price (USDC) - auto-converted or manual
- Images* (drag & drop, max 10)
- Product type (Physical/Digital)
- Category
- Tags
- Variants (Size, Color, etc.)
- Inventory tracking
- Weight (for shipping)
- Bonding curve goal (optional)

### Module 3: Checkout & Payments

**Flow:**
```
1. Customer adds items to cart
2. Customer clicks "Checkout"
3. Customer enters shipping info (if physical)
4. Customer selects payment method (SOL/USDC)
5. Customer connects wallet
6. Payment request generated (Solana Pay)
7. Customer approves transaction
8. Transaction confirmed on-chain
9. Order created, inventory updated
10. Merchant notified
11. Customer receives confirmation
```

**Payment Processing:**
```
Customer pays → Platform wallet receives funds
                     ↓
              Order marked as paid
                     ↓
              Platform fee deducted (3.5%)
                     ↓
              Merchant amount held in escrow
                     ↓
              When shipped/delivered → Payout released
```

### Module 4: Payouts

**Payout Options:**

1. **Manual Payouts** (Admin triggered)
   - Admin reviews pending payouts
   - Admin initiates payout to merchant wallet
   - Transaction signed and sent

2. **Auto Payouts** (Scheduled)
   - Daily/weekly automatic payouts
   - When balance exceeds threshold
   - Requires merchant to have verified wallet

**Payout Schedule:**
```
- Orders marked "delivered" → Funds available
- Pending period: 7 days (dispute window)
- Auto-payout: Every Monday at 00:00 UTC
- Minimum payout: 0.5 SOL or $10 USDC
```

---

## 💰 Payment Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Customer   │────▶│ Checkout Page│────▶│ Solana Pay QR/  │
│   Wallet    │     │              │     │ Wallet Connect  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Merchant   │◀────│   Payouts    │◀────│ Platform Wallet │
│   Wallet    │     │   Module     │     │  (Escrow)       │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Platform Fee │
                    │   (3.5%)     │
                    └──────────────┘
```

**Transaction Breakdown Example:**
```
Customer pays:     1.0 SOL
Platform fee:      0.035 SOL (3.5%)
Merchant receives: 0.965 SOL
```

---

## 🛠️ Tech Stack

### Frontend
```
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui components
- Zustand (state management)
- React Query (data fetching)
```

### Backend
```
- Next.js API Routes (or separate Express server)
- PostgreSQL (Supabase or Railway)
- Prisma ORM
- Redis (caching, queues)
- Bull (job queues for payouts)
```

### Authentication
```
- Privy (wallet + email auth)
- JWT tokens
- Role-based access control
```

### Blockchain
```
- Solana Web3.js
- Solana Pay
- Helius (RPC + webhooks)
- Metaplex (if NFT receipts)
```

### File Storage
```
- Cloudflare R2 (S3-compatible, cheaper)
- Or AWS S3
- Image optimization: Cloudflare Images
```

### Hosting
```
- Vercel (frontend)
- Railway or Render (backend/database)
- Supabase (database + auth alternative)
```

### Monitoring
```
- Sentry (error tracking)
- Vercel Analytics
- PostHog (product analytics)
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login          - Login with wallet/email
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Get current user
```

### Stores
```
GET    /api/stores              - List all approved stores
GET    /api/stores/:slug        - Get store by slug
POST   /api/stores              - Create store application
PUT    /api/stores/:id          - Update store (owner only)
DELETE /api/stores/:id          - Delete store (owner/admin)
```

### Products
```
GET    /api/products            - List products (with filters)
GET    /api/products/:id        - Get product details
POST   /api/products            - Create product (merchant)
PUT    /api/products/:id        - Update product (merchant)
DELETE /api/products/:id        - Delete product (merchant)
POST   /api/products/:id/submit - Submit for review
```

### Orders
```
GET    /api/orders              - List orders (filtered by role)
GET    /api/orders/:id          - Get order details
POST   /api/orders              - Create order (checkout)
PUT    /api/orders/:id/status   - Update order status
POST   /api/orders/:id/ship     - Mark as shipped
POST   /api/orders/:id/cancel   - Cancel order
```

### Payments
```
POST   /api/payments/create     - Create payment request
POST   /api/payments/verify     - Verify payment (webhook)
GET    /api/payments/:id        - Get payment status
```

### Payouts (Admin)
```
GET    /api/payouts             - List all payouts
GET    /api/payouts/pending     - Get pending payouts
POST   /api/payouts/:id/process - Process payout
GET    /api/payouts/store/:id   - Get store payout history
```

### Admin
```
GET    /api/admin/stores/pending      - Pending store applications
POST   /api/admin/stores/:id/approve  - Approve store
POST   /api/admin/stores/:id/reject   - Reject store

GET    /api/admin/products/pending    - Pending products
POST   /api/admin/products/:id/approve - Approve product
POST   /api/admin/products/:id/reject  - Reject product

GET    /api/admin/analytics           - Platform analytics
GET    /api/admin/users               - Manage users
POST   /api/admin/users/:id/ban       - Ban user
```

---

## 🖥️ Admin Portal Features

### Dashboard
```
- Total revenue (today/week/month/all-time)
- Total orders
- Active stores
- Pending approvals (stores + products)
- Recent transactions
- Charts: Revenue over time, orders over time
```

### Store Management
```
- List all stores (filterable by status)
- View store details
- Approve/reject pending stores
- Suspend/unsuspend stores
- View store analytics
- Manual payout trigger
```

### Product Management
```
- List all products (filterable)
- View product details
- Approve/reject pending products
- Flag inappropriate products
- Bulk actions
```

### Order Management
```
- List all orders
- View order details
- Process refunds
- Handle disputes
- Export orders (CSV)
```

### Payout Management
```
- View pending payouts
- Process payouts (manual)
- View payout history
- Configure auto-payouts
- View failed payouts
```

### User Management
```
- List all users
- View user details
- Change user roles
- Ban/unban users
- View user activity
```

### Settings
```
- Platform fee percentage
- Minimum payout amounts
- Auto-payout settings
- Allowed product categories
- Blocked wallets/users
- Email templates
```

---

## 🔒 Security Considerations

### Authentication & Authorization
```
- Wallet signature verification
- JWT with short expiry + refresh tokens
- Role-based access control (RBAC)
- API rate limiting
```

### Payment Security
```
- Verify all transactions on-chain
- Use Helius webhooks for confirmation
- Escrow funds until delivery
- Multi-sig for large payouts (optional)
```

### Data Security
```
- Encrypt sensitive data at rest
- HTTPS everywhere
- Input validation & sanitization
- SQL injection prevention (Prisma)
- XSS prevention
```

### Fraud Prevention
```
- Velocity checks on purchases
- Block suspicious wallets
- Manual review for large orders
- Dispute resolution system
```

---

## 📅 Development Roadmap

### Phase 1: MVP (4-6 weeks)
```
Week 1-2:
- [ ] Database setup
- [ ] Authentication (Privy)
- [ ] Basic store creation
- [ ] Product upload

Week 3-4:
- [ ] Store frontend
- [ ] Product listing
- [ ] Basic checkout
- [ ] Solana Pay integration

Week 5-6:
- [ ] Admin portal (basic)
- [ ] Store approval flow
- [ ] Order management
- [ ] Testing & bug fixes
```

### Phase 2: Core Features (4 weeks)
```
- [ ] Product variants
- [ ] Inventory management
- [ ] Payout system
- [ ] Order tracking
- [ ] Email notifications
- [ ] Merchant dashboard
```

### Phase 3: Advanced Features (4 weeks)
```
- [ ] Bonding curve pricing
- [ ] Custom domains
- [ ] Store analytics
- [ ] Reviews & ratings
- [ ] Affiliate system
- [ ] Digital products
```

### Phase 4: Scale & Polish (Ongoing)
```
- [ ] Performance optimization
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Multi-currency support
- [ ] International shipping
- [ ] API for third-party integrations
```

---

## 💡 Additional Features to Consider

### For Merchants
- [ ] Discount codes
- [ ] Bulk product upload (CSV)
- [ ] Print-on-demand integration
- [ ] Dropshipping support
- [ ] Email marketing tools
- [ ] SEO tools

### For Customers
- [ ] Wishlist
- [ ] Product recommendations
- [ ] Order notifications (email/push)
- [ ] Guest checkout
- [ ] Multiple payment methods

### For Platform
- [ ] Fraud detection ML
- [ ] Automated tax calculation
- [ ] Multi-language support
- [ ] White-label solution
- [ ] Mobile apps

---

## 📞 Third-Party Integrations

| Service | Purpose |
|---------|---------|
| Privy | Authentication |
| Helius | Solana RPC + Webhooks |
| Cloudflare R2 | File storage |
| Resend | Transactional emails |
| Shippo/EasyPost | Shipping labels |
| Printful | Print-on-demand |
| Stripe | Fiat on-ramp (optional) |
| Discord | Community/support |

---

## 📊 Success Metrics

### Platform Health
- Monthly Active Users (MAU)
- Monthly Gross Merchandise Value (GMV)
- Number of active stores
- Average order value
- Platform revenue (fees)

### Merchant Success
- Average time to first sale
- Merchant retention rate
- Average merchant revenue
- Payout success rate

### Customer Experience
- Conversion rate
- Cart abandonment rate
- Repeat purchase rate
- Customer satisfaction (NPS)

---

*Document created for crypto commerce platform development*
*Last updated: December 2024*
