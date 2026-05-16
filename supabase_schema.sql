-- SQL Schema for Supabase PostgreSQL
-- Run this in your Supabase SQL Editor

-- 1. Store Config
CREATE TABLE config (
  id TEXT PRIMARY KEY,
  isOpen BOOLEAN DEFAULT true,
  minOrderValue INTEGER DEFAULT 50,
  reopenMessage TEXT,
  storeInfo JSONB DEFAULT '{"name": "Hone Dukaan", "phone": "9999999999", "location": "Village Near Kota", "ownerName": "Hemant Natani"}'::jsonb
);

INSERT INTO config (id, isOpen, minOrderValue) VALUES ('main', true, 50);

-- 2. Products
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  image TEXT,
  availabilityStatus TEXT DEFAULT 'Available Today',
  variants JSONB DEFAULT '[]'::jsonb,
  discountPercent INTEGER DEFAULT 0,
  discountFlat INTEGER DEFAULT 0,
  isFeatured BOOLEAN DEFAULT false,
  hindiName TEXT,
  englishAliases TEXT[] DEFAULT '{}'::text[],
  searchKeywords TEXT[] DEFAULT '{}'::text[],
  image_url TEXT,
  image_path TEXT
);

-- 3. Users
CREATE TABLE users (
  uid UUID PRIMARY KEY, -- References auth.users(id)
  fullName TEXT NOT NULL,
  phoneNumber TEXT,
  email TEXT,
  place TEXT,
  role TEXT DEFAULT 'customer',
  trustLabel TEXT DEFAULT 'normal',
  creditLimit NUMERIC(10,2) DEFAULT 500.00,
  balance NUMERIC(10,2) DEFAULT 0.00,       -- store credit / khata balance (real money)
  rewardPoints NUMERIC(10,2) DEFAULT 0.00,  -- loyalty reward points (1 point = ₹1 redeemable)
  lastActive TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID REFERENCES users(uid),
  customerName TEXT NOT NULL,
  customerPhone TEXT NOT NULL,
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'Placed',
  paymentStatus TEXT DEFAULT 'pending',
  pickupSlot TEXT NOT NULL,
  ownerNote TEXT,
  customerResponse TEXT,
  pickedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Khata Entries
CREATE TABLE khata_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID REFERENCES users(uid),
  type TEXT NOT NULL, -- 'Order', 'Payment', 'Correction'
  amount INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT,
  status TEXT DEFAULT 'pending',
  isDisputed BOOLEAN DEFAULT false,
  disputeReason TEXT,
  orderId UUID REFERENCES orders(id)
);

-- 7. Reward Transactions
CREATE TABLE reward_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID REFERENCES users(uid) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expiry', 'correction')),
  points NUMERIC(10,2) NOT NULL,
  orderId UUID REFERENCES orders(id),
  note TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

-- users: customers can only see/update their own row
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = uid);
-- Admins (service role) bypass RLS automatically

-- products: anyone can read, only service role (backend) can write
CREATE POLICY "products_select_public" ON products FOR SELECT USING (true);

-- config: anyone can read, only service role (backend) can write
CREATE POLICY "config_select_public" ON config FOR SELECT USING (true);

-- orders: customers can read their own, insert their own; only backend writes updates
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = userId);
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (auth.uid() = userId);

-- khata_entries: customers can read their own entries only
CREATE POLICY "khata_select_own" ON khata_entries FOR SELECT USING (auth.uid() = userId);

-- push_subscriptions: users manage their own subscription
CREATE POLICY "push_select_own" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_insert_own" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_update_own" ON push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "push_delete_own" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "reward_tx_select_own" ON reward_transactions FOR SELECT USING (auth.uid() = userId);


-- ==========================================
-- LOYALTY SYSTEM SCHEMA
-- ==========================================

-- Add referral columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(uid);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_used BOOLEAN DEFAULT false;

-- Loyalty Settings (single-row config)
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  streak JSONB DEFAULT '{"milestone_days": 3, "bonus_amount": 5, "min_order_value": 200, "coupon_expiry_days": 7}',
  badges JSONB DEFAULT '[{"key": "naya_grahak", "label": "Naya Grahak", "emoji": "🌱", "order_threshold": 1, "discount_amount": 0}, {"key": "pakka_grahak", "label": "Pakka Grahak", "emoji": "⭐", "order_threshold": 5, "discount_amount": 0}, {"key": "vishwaspatri", "label": "Vishwaspatri", "emoji": "🏅", "order_threshold": 20, "discount_amount": 0}, {"key": "sitara", "label": "Sitara", "emoji": "👑", "order_threshold": 50, "discount_amount": 20}]',
  referral JSONB DEFAULT '{"new_customer_discount": 10, "min_order_new_customer": 150, "referrer_reward_coins": 10, "min_order_referrer_reward": 200}',
  coins JSONB DEFAULT '{"milestones": [{"threshold": 500, "coins": 2}, {"threshold": 1000, "coins": 5}, {"threshold": 2000, "coins": 8}], "min_redeem": 25}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default loyalty settings
INSERT INTO loyalty_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- Streak tracking
CREATE TABLE IF NOT EXISTS customer_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(uid) NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_order_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streak coupons
CREATE TABLE IF NOT EXISTS streak_coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(uid) NOT NULL,
  discount_amount NUMERIC NOT NULL,
  min_order_value NUMERIC NOT NULL,
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_id UUID REFERENCES orders(id)
);

-- Customer badges
CREATE TABLE IF NOT EXISTS customer_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(uid) NOT NULL,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  total_orders_at_earn INT NOT NULL,
  UNIQUE(user_id, badge_key)
);

-- Coin transactions (ledger)
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(uid) NOT NULL,
  amount NUMERIC NOT NULL,  -- positive=credit, negative=debit
  type TEXT NOT NULL,  -- 'order_earn' | 'referral_credit' | 'redemption' | 'admin_adjustment'
  order_id UUID REFERENCES orders(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coin spend milestone log (prevents double-awarding)
CREATE TABLE IF NOT EXISTS coin_spend_milestones_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(uid) NOT NULL,
  milestone_rupee_threshold NUMERIC NOT NULL,
  coins_awarded NUMERIC NOT NULL,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone_rupee_threshold)
);

-- Referral transactions
CREATE TABLE IF NOT EXISTS referral_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID REFERENCES users(uid) NOT NULL,
  referred_user_id UUID REFERENCES users(uid) NOT NULL,
  order_id UUID REFERENCES orders(id),
  referrer_reward_coins NUMERIC NOT NULL,
  referred_discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function for coin balance
CREATE OR REPLACE FUNCTION get_coin_balance(p_user_id UUID) 
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount), 0) FROM coin_transactions WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Function for idempotent order coin credit
CREATE OR REPLACE FUNCTION credit_coins_for_order(
  p_order_id UUID,
  p_user_id UUID,
  p_coins NUMERIC,
  p_note TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Check if order_earn transaction already exists for this order
  SELECT id INTO existing_id FROM coin_transactions 
  WHERE order_id = p_order_id AND type = 'order_earn'
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN false;
  END IF;

  INSERT INTO coin_transactions (user_id, amount, type, order_id, note)
  VALUES (p_user_id, p_coins, 'order_earn', p_order_id, p_note);

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Atomic reward point update (prevents race conditions)
CREATE OR REPLACE FUNCTION update_reward_points(p_user_id UUID, p_delta NUMERIC)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users SET rewardPoints = rewardPoints + p_delta WHERE uid = p_user_id;
$$;

-- ==========================================
-- NOTIFICATIONS SYSTEM SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  order_id UUID REFERENCES orders(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ==========================================
-- STORAGE SYSTEM SCHEMA
-- ==========================================
-- Note: Insert bucket script below is conceptual for tracking, 
-- actual storage policies must be applied via Supabase UI or migrations
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
CREATE POLICY "Public Read Product Images" ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin Insert Product Images" ON storage.objects;
CREATE POLICY "Admin Insert Product Images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND (SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin Update Product Images" ON storage.objects;
CREATE POLICY "Admin Update Product Images" ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND (SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin Delete Product Images" ON storage.objects;
CREATE POLICY "Admin Delete Product Images" ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND (SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE config;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE khata_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;