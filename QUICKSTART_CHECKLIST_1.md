# ✅ QUICK START CHECKLIST

Print this out and check off each step as you complete it!

---

## Setup (One Time)

- [ ] **1. Extract project**
  ```bash
  unzip store-fun-platform.zip
  cd store-fun-platform
  ```

- [ ] **2. Install dependencies**
  ```bash
  npm install
  ```

- [ ] **3. Create database** (pick one)
  - [ ] Supabase: https://supabase.com
  - [ ] Railway: https://railway.app
  - [ ] Local PostgreSQL

- [ ] **4. Create `.env.local`**
  ```bash
  cp .env.example .env.local
  ```

- [ ] **5. Fill in environment variables**
  - [ ] DATABASE_URL
  - [ ] NEXT_PUBLIC_PRIVY_APP_ID
  - [ ] PRIVY_APP_SECRET
  - [ ] NEXT_PUBLIC_PLATFORM_WALLET

- [ ] **6. Edit `prisma/seed.ts`** - Add YOUR wallet address!

- [ ] **7. Set up database**
  ```bash
  npm run db:push
  npm run db:seed
  ```

- [ ] **8. Verify Super Admin**
  ```bash
  npm run db:studio
  ```
  Check users table → Your wallet = SUPER_ADMIN ✓

- [ ] **9. Run it!**
  ```bash
  npm run dev
  ```

- [ ] **10. Open http://localhost:3000** 🎉

---

## Test the Flow

- [ ] Connect your wallet on homepage
- [ ] Go to `/merchant/dashboard`
- [ ] Create a test product
- [ ] Go to admin portal and approve it
- [ ] Check homepage - product should appear!

---

## Deploy (When Ready)

- [ ] Push to GitHub
- [ ] Import to Vercel
- [ ] Add environment variables
- [ ] Update Privy allowed domains
- [ ] Deploy! 🚀

---

## Your Wallet Address

Write it here for reference:

```
_________________________________________________
```

---

## Important URLs

| URL | What |
|-----|------|
| http://localhost:3000 | Homepage |
| http://localhost:3000/merchant/dashboard | Merchant Dashboard |
| http://localhost:3000/admin | Admin Portal |

---

## Need Help?

1. Check README.md for detailed docs
2. Check SETUP_GUIDE.md for troubleshooting
3. Check PLATFORM_ARCHITECTURE.md for technical details

---

Good luck! 🚀
