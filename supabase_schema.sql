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
  searchKeywords TEXT[] DEFAULT '{}'::text[]
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
  creditLimit INTEGER DEFAULT 500,
  balance INTEGER DEFAULT 0,
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

-- 6. Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on every table
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- config: anyone reads, only admin writes
CREATE POLICY "config_read" ON config FOR SELECT USING (true);
CREATE POLICY "config_write" ON config FOR ALL
  USING ((SELECT role FROM users WHERE uid = auth.uid()) = 'admin');

-- products: anyone reads, only admin writes
CREATE POLICY "products_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_write" ON products FOR ALL
  USING ((SELECT role FROM users WHERE uid = auth.uid()) = 'admin');

-- orders: customers see only their own, admin sees all
CREATE POLICY "orders_customer_read" ON orders FOR SELECT
  USING (auth.uid() = userId OR (SELECT role FROM users WHERE uid = auth.uid()) = 'admin');
CREATE POLICY "orders_customer_insert" ON orders FOR INSERT
  WITH CHECK (auth.uid() = userId);
CREATE POLICY "orders_admin_write" ON orders FOR UPDATE
  USING ((SELECT role FROM users WHERE uid = auth.uid()) = 'admin');

-- users: read own row only, admin reads all
CREATE POLICY "users_self" ON users FOR SELECT
  USING (auth.uid() = uid OR (SELECT role FROM users WHERE uid = auth.uid()) = 'admin');
CREATE POLICY "users_self_update" ON users FOR UPDATE
  USING (auth.uid() = uid);

-- khata: customers read own entries, admin reads/writes all
CREATE POLICY "khata_read" ON khata_entries FOR SELECT
  USING (auth.uid() = userId OR (SELECT role FROM users WHERE uid = auth.uid()) = 'admin');
CREATE POLICY "khata_admin_write" ON khata_entries FOR ALL
  USING ((SELECT role FROM users WHERE uid = auth.uid()) = 'admin');