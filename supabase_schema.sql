-- SQL Schema for Supabase PostgreSQL
-- Run this in your Supabase SQL Editor

-- 1. Store Config
CREATE TABLE config (
  id TEXT PRIMARY KEY,
  isOpen BOOLEAN DEFAULT true,
  minOrderValue INTEGER DEFAULT 50,
  storeInfo JSONB DEFAULT '{"name": "Apni Dukan", "ownerName": "Hemant Natani", "location": "Village Near Kota", "phone": "9999999999"}'::jsonb
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
  variants JSONB DEFAULT '[]'::jsonb
);

-- 3. Users
CREATE TABLE users (
  uid TEXT PRIMARY KEY, -- From Supabase Auth
  fullName TEXT NOT NULL,
  phoneNumber TEXT,
  place TEXT,
  role TEXT DEFAULT 'users',
  trustLabel TEXT DEFAULT 'normal',
  creditLimit INTEGER DEFAULT 500,
  balance INTEGER DEFAULT 0,
  lastActive TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT REFERENCES users(uid),
  customerName TEXT NOT NULL,
  customerPhone TEXT NOT NULL,
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'Placed',
  pickupSlot TEXT NOT NULL,
  ownerNote TEXT,
  customerResponse TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Khata Entries
CREATE TABLE khata_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT REFERENCES users(uid),
  type TEXT NOT NULL, -- 'Order', 'Payment', 'Correction'
  amount INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT,
  isDisputed BOOLEAN DEFAULT false,
  orderId UUID REFERENCES orders(id)
);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE config;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE khata_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
