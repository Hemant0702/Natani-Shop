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

-- Enable Realtime for all tables
-- Run these commands in Supabase SQL editor if not already enabled
-- ALTER PUBLICATION supabase_realtime ADD TABLE config;
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE khata_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
