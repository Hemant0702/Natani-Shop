export type UserRole = 'customer' | 'admin';
export type TrustLabel = 'trusted' | 'normal' | 'careful';
export type AvailabilityStatus = 'Available Today' | 'Running Low' | 'Out of Stock';
export type OrderStatus = 'Placed' | 'Accepted' | 'Packing' | 'Packed' | 'Picked' | 'Cancelled';
export type PaymentStatus = 'pending' | 'collected';
export type KhataType = 'Order' | 'Payment' | 'Adjustment';
export type ProductUnit = 'kg' | 'litre' | 'packet' | 'piece';

export interface ProductVariant {
  label: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  hindiName?: string;
  englishAliases?: string[];
  searchKeywords?: string[];
  category: string;
  price: number;
  unit: ProductUnit;
  variants?: ProductVariant[];
  availabilityStatus: AvailabilityStatus;
  description?: string;
  image?: string;
  image_url?: string;
  image_path?: string;
  discountPercent?: number;
  discountFlat?: number;
  isFeatured?: boolean;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  place: string;
  role: UserRole;
  trustLabel: TrustLabel;
  creditLimit: number;
  balance: number;
  rewardPoints: number;
  lastActive: string;
  updatedAt: string;
  appliedReferralCode?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantLabel?: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  pickupSlot: string;
  ownerNote?: string;
  customerResponse?: 'OK' | 'Cancel Item';
  pickedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KhataEntry {
  id: string;
  userId: string;
  type: KhataType;
  amount: number;
  date: string;
  note?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  status?: string;
  orderId?: string;
}

export interface StoreConfig {
  isOpen: boolean;
  reopenMessage: string;
  minOrderValue: number;
  storeInfo: {
    name: string;
    ownerName: string;
    address: string;
    phone: string;
    operatingHours: string;
  };
}

// ─── Loyalty Types ──────────────────────────────────────────────────────

export type BadgeKey = 'naya_grahak' | 'pakka_grahak' | 'vishwaspatri' | 'sitara';
export type CoinTransactionType = 'order_earn' | 'referral_credit' | 'redemption' | 'admin_adjustment';

export interface CustomerStreak {
  currentStreak: number;
  longestStreak: number;
  lastOrderDate: string | null;
}

export interface StreakCoupon {
  id: string;
  discountAmount: number;
  minOrderValue: number;
  expiresAt: string;
}

export interface CustomerBadge {
  badgeKey: BadgeKey;
  earnedAt: string;
  totalOrdersAtEarn: number;
  label?: string;
  emoji?: string;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  type: CoinTransactionType;
  note: string | null;
  createdAt: string;
}

export interface LoyaltyStatus {
  streak: CustomerStreak;
  badges: CustomerBadge[];
  highestBadge: { key: string; label: string; emoji: string } | null;
  coinBalance: number;
  rewardPoints: number;
  referralCode: string;
  referralUsed: boolean;
  hasReferrer?: boolean;
  activeCoupon: StreakCoupon | null;
  totalOrders: number;
  nextBadge: {
    key: string;
    label: string;
    emoji: string;
    ordersNeeded: number;
    orderThreshold: number;
  } | null;
  recentTransactions: CoinTransaction[];
  settings: {
    streakMilestone: number;
    minRedeem: number;
  };
}

export interface LoyaltySettings {
  streak: {
    milestone_days: number;
    bonus_amount: number;
    min_order_value: number;
    coupon_expiry_days: number;
  };
  badges: Array<{
    badge_key: string;
    label: string;
    emoji: string;
    order_threshold: number;
    unlock_type: string;
    discount_amount: number | null;
    is_active: boolean;
  }>;
  referral: {
    new_customer_discount: number;
    min_order_new_customer: number;
    referrer_reward_coins: number;
    min_order_referrer_reward: number;
  };
  coins: {
    milestones: Array<{ threshold: number; coins: number }>;
    min_redeem: number;
  };
}

export interface FeaturedCustomer {
  userId: string;
  fullName: string;
  badgeKey: string;
  badgeLabel: string;
  badgeEmoji: string;
}

export interface EnrichedCustomer extends UserProfile {
  totalOrders: number;
  badge: { key: string; emoji: string; label: string } | null;
  coinBalance: number;
  currentStreak: number;
  referralsMade: number;
}

export interface Voucher {
  id: string;
  code: string;
  description: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  min_order_value: number;
  max_discount_amount?: number;
  expires_at?: string;
  is_active: boolean;
}

export interface VoucherUsage {
  id: string;
  voucher_id: string;
  user_id: string;
  order_id?: string;
  used_at: string;
}

export type RewardTransactionType = 'earn' | 'redeem' | 'expiry' | 'correction';

export interface RewardTransaction {
  id: string;
  userId: string;
  type: RewardTransactionType;
  points: number;
  orderId?: string;
  note?: string;
  createdAt: string;
}

