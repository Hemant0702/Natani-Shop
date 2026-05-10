import { supabase } from '../lib/supabase';
import { Product, Order, KhataEntry, UserProfile, StoreConfig } from '../types';

export const useDatabase = () => {
  // Config
  const getStoreConfig = async () => {
    const { data, error } = await supabase.from('config').select('*').eq('id', 'main').single();
    if (error) console.error('Error fetching config:', error);
    return data as StoreConfig | null;
  };

  // Realtime subscription for config
  const subscribeToStoreConfig = (callback: (config: StoreConfig) => void) => {
    const channel = supabase
      .channel('store_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config', filter: 'id=eq.main' }, 
        (payload) => callback(payload.new as StoreConfig)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  // Products
  const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) console.error('Error fetching products:', error);
    return data as Product[] || [];
  };

  const subscribeToProducts = (callback: (products: Product[]) => void) => {
    const channel = supabase
      .channel('products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const products = await getProducts();
        callback(products);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  // Profile
  const getUserProfile = async (uid: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('uid', uid).single();
    if (error) return null;
    return data as UserProfile;
  };

  const createUserProfile = async (profile: UserProfile) => {
    const { error } = await supabase.from('users').upsert(profile);
    if (error) console.error('Error creating profile:', error);
  };

  // Orders
  const placeOrder = async (order: Omit<Order, 'id'>) => {
    // Check credit limit before placing
    const { data: profile } = await supabase.from('users').select('balance, creditLimit').eq('uid', order.userId).single();
    if (profile && profile.balance >= profile.creditLimit) {
      throw new Error(`Aapka khata Rs. ${profile.creditLimit} ho gaya — pehle thoda pay karo`);
    }

    const { data, error } = await supabase.from('orders').insert([order]).select();
    if (error) throw error;
    return data?.[0]?.id;
  };

  const updateOrderResponse = async (orderId: string, response: 'OK' | 'Cancel Item') => {
    await supabase.from('orders').update({ customerResponse: response, updatedAt: new Date().toISOString() }).eq('id', orderId);
  };

  const subscribeToUserOrders = (userId: string, callback: (orders: Order[]) => void) => {
    const channel = supabase
      .channel(`orders_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `userId=eq.${userId}` }, async () => {
        const { data } = await supabase.from('orders').select('*').eq('userId', userId).order('createdAt', { ascending: false });
        callback(data as Order[] || []);
      })
      .subscribe();
    
    // Initial fetch
    supabase.from('orders').select('*').eq('userId', userId).order('createdAt', { ascending: false })
      .then(({ data }) => callback(data as Order[] || []));
      
    return () => supabase.removeChannel(channel);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status, updatedAt: new Date().toISOString() }).eq('id', orderId);
    if (error) console.error('Error updating order:', error);
  };

  const subscribeToAllOrders = (callback: (orders: Order[]) => void) => {
    const channel = supabase
      .channel('all_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data } = await supabase.from('orders').select('*').order('createdAt', { ascending: false });
        callback(data as Order[] || []);
      })
      .subscribe();
    
    supabase.from('orders').select('*').order('createdAt', { ascending: false })
      .then(({ data }) => callback(data as Order[] || []));
      
    return () => supabase.removeChannel(channel);
  };

  // Khata
  const flagKhataEntry = async (entryId: string) => {
    await supabase.from('khata_entries').update({ isDisputed: true }).eq('id', entryId);
  };

  const subscribeToKhata = (userId: string, callback: (entries: KhataEntry[]) => void) => {
    const channel = supabase
      .channel(`khata_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'khata_entries', filter: `userId=eq.${userId}` }, async () => {
        const { data } = await supabase.from('khata_entries').select('*').eq('userId', userId).order('date', { ascending: false });
        callback(data as KhataEntry[] || []);
      })
      .subscribe();

    // Initial fetch
    supabase.from('khata_entries').select('*').eq('userId', userId).order('date', { ascending: false })
      .then(({ data }) => callback(data as KhataEntry[] || []));

    return () => supabase.removeChannel(channel);
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
    subscribeToAllOrders,
    subscribeToKhata,
    flagKhataEntry
  };
};
