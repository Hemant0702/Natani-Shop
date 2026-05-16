import { api } from '../lib/api';
import { Product, Order, KhataEntry, UserProfile, StoreConfig, LoyaltyStatus, LoyaltySettings, FeaturedCustomer, EnrichedCustomer, Voucher } from '../types';

export const useDatabase = () => {
  const POLLING_INTERVAL = 5000; // 5 seconds

  // Config
  const getStoreConfig = async () => {
    try {
      return await api.get('/api/config') as StoreConfig;
    } catch (error) {
      console.error('Error fetching config:', error);
      return null;
    }
  };

  const subscribeToStoreConfig = (callback: (config: StoreConfig) => void) => {
    const poll = async () => {
      const config = await getStoreConfig();
      if (config) callback(config);
    };
    poll();
    const interval = setInterval(poll, POLLING_INTERVAL);
    return () => clearInterval(interval);
  };

  // Products
  const getProducts = async () => {
    try {
      return await api.get('/api/products') as Product[];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  };

  const subscribeToProducts = (callback: (products: Product[]) => void) => {
    const poll = async () => {
      const products = await getProducts();
      callback(products);
    };
    poll();
    const interval = setInterval(poll, POLLING_INTERVAL);
    return () => clearInterval(interval);
  };

  // Profile
  const getUserProfile = async (uid: string) => {
    try {
      return await api.get('/api/auth/profile') as UserProfile;
    } catch (error) {
      return null;
    }
  };

  const createUserProfile = async (profile: UserProfile) => {
    return await api.post('/api/auth/register-profile', profile);
  };

  // Orders
  const placeOrder = async (order: Omit<Order, 'id'> & { streakCouponId?: string; coinRedemptionAmount?: number; referralCode?: string; voucherCode?: string }) => {
    const data = await api.post('/api/orders', order);
    return data;
  };

  const updateOrderResponse = async (orderId: string, response: 'OK' | 'Cancel Item') => {
    await api.put(`/api/orders/${orderId}/response`, { customerResponse: response });
  };

  const subscribeToUserOrders = (userId: string, callback: (orders: Order[]) => void) => {
    const poll = async () => {
      try {
        const orders = await api.get('/api/orders/my');
        callback(orders);
      } catch (e) {
        console.error('Error polling orders:', e);
      }
    };
    poll();
    const interval = setInterval(poll, POLLING_INTERVAL);
    return () => clearInterval(interval);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await api.put(`/api/orders/${orderId}/status`, { status });
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: 'collected' | 'pending') => {
    await api.put(`/api/orders/${orderId}/payment-status`, { paymentStatus });
  };

  const markOrderPicked = async (orderId: string, paymentStatus: 'collected' | 'pending') => {
    await api.put(`/api/orders/${orderId}/pick`, { paymentStatus });
  };

  const subscribeToAllOrders = (callback: (orders: Order[]) => void) => {
    const poll = async () => {
      try {
        const orders = await api.get('/api/orders/all');
        callback(orders);
      } catch (e) {
        console.error('Error polling all orders:', e);
      }
    };
    poll();
    const interval = setInterval(poll, POLLING_INTERVAL);
    return () => clearInterval(interval);
  };

  // Khata
  const flagKhataEntry = async (entryId: string) => {
    await api.put(`/api/khata/${entryId}/flag`, { isDisputed: true });
  };

  const subscribeToKhata = (userId: string, callback: (entries: KhataEntry[]) => void) => {
    const poll = async () => {
      try {
        const entries = await api.get(`/api/khata/${userId}`);
        callback(entries);
      } catch (e) {
        console.error('Error polling khata:', e);
      }
    };
    poll();
    const interval = setInterval(poll, POLLING_INTERVAL);
    return () => clearInterval(interval);
  };

  const subscribeToAllKhata = (callback: (entries: KhataEntry[]) => void) => {
    return () => {}; 
  };

  // All customers
  const getAllCustomers = async () => {
    try {
      return await api.get('/api/customers') as EnrichedCustomer[];
    } catch (e) {
      return [];
    }
  };

  // ─── Loyalty API ────────────────────────────────────────────────────
  const getLoyaltyStatus = async (): Promise<LoyaltyStatus | null> => {
    try {
      return await api.get('/api/loyalty/my-status') as LoyaltyStatus;
    } catch (e) {
      console.error('Error fetching loyalty status:', e);
      return null;
    }
  };

  const getFeaturedCustomers = async (): Promise<FeaturedCustomer[]> => {
    try {
      return await api.get('/api/loyalty/featured-customers') as FeaturedCustomer[];
    } catch (e) {
      console.error('Error fetching featured customers:', e);
      return [];
    }
  };

  const getLoyaltySettings = async (): Promise<LoyaltySettings | null> => {
    try {
      return await api.get('/api/loyalty/settings') as LoyaltySettings;
    } catch (e) {
      return null;
    }
  };

  const updateLoyaltySettings = async (settings: Partial<LoyaltySettings>) => {
    return await api.put('/api/loyalty/settings', settings);
  };

  const redeemCoins = async (amount: number, orderId: string) => {
    return await api.post('/api/loyalty/redeem-coins', { amount, orderId });
  };

  const applyReferral = async (referralCode: string, orderId: string, orderTotal: number) => {
    return await api.post('/api/loyalty/apply-referral', { referralCode, orderId, orderTotal });
  };

  const getCustomerLoyaltyDetail = async (userId: string) => {
    return await api.get(`/api/loyalty/customer/${userId}`);
  };

  const adjustCoins = async (userId: string, amount: number, note: string) => {
    return await api.post('/api/loyalty/admin/adjust-coins', { userId, amount, note });
  };

  const getAvailableVouchers = async (): Promise<Voucher[]> => {
    try {
      return await api.get('/api/loyalty/vouchers/available') as Voucher[];
    } catch (e) {
      return [];
    }
  };

  const validateVoucherCode = async (code: string, orderTotal: number) => {
    return await api.post('/api/loyalty/validate-voucher', { code, orderTotal });
  };


  return {
    getStoreConfig,
    subscribeToStoreConfig,
    getProducts,
    subscribeToProducts,
    getUserProfile,
    createUserProfile,
    placeOrder,
    subscribeToUserOrders,
    updateOrderStatus,
    updateOrderResponse,
    updatePaymentStatus,
    markOrderPicked,
    subscribeToAllOrders,
    subscribeToKhata,
    subscribeToAllKhata,
    flagKhataEntry,
    getAllCustomers,
    // Loyalty
    getLoyaltyStatus,
    getFeaturedCustomers,
    getLoyaltySettings,
    updateLoyaltySettings,
    redeemCoins,
    applyReferral,
    getCustomerLoyaltyDetail,
    adjustCoins,
    getAvailableVouchers,
    validateVoucherCode,
  };
};

