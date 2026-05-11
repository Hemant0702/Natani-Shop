export type UserRole = 'users' | 'admin';
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
  lastActive: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantLabel?: string;
  price: number;
  quantity: number;
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
