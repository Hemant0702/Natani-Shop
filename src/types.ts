export type UserRole = 'customer' | 'owner';
export type TrustLabel = 'trusted' | 'normal' | 'careful';
export type AvailabilityStatus = 'Available Today' | 'Running Low' | 'Out of Stock';
export type OrderStatus = 'Placed' | 'Being Packed' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
export type KhataType = 'Order' | 'Payment' | 'Adjustment';

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
  unit: 'kg' | 'litre' | 'packet' | 'piece';
  variants?: ProductVariant[];
  availabilityStatus: AvailabilityStatus;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  phoneNumber: string;
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
