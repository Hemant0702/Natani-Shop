import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, OrderItem, StoreConfig, Product } from '../types';

interface AppState {
  user: UserProfile | null;
  storeConfig: StoreConfig | null;
  cart: OrderItem[];
  isLoading: boolean;
  
  setAuth: (user: UserProfile | null) => void;
  setStoreConfig: (config: StoreConfig | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Cart Actions
  addToCart: (product: Product, variantLabel?: string, quantity?: number) => void;
  removeFromCart: (productId: string, variantLabel?: string) => void;
  updateQuantity: (productId: string, variantLabel: string | undefined, delta: number) => void;
  clearCart: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      storeConfig: null,
      cart: [],
      isLoading: true,

      setAuth: (user) => set({ user }),
      setStoreConfig: (config) => set({ storeConfig: config }),
      setLoading: (loading) => set({ isLoading: loading }),

      addToCart: (product, variantLabel, quantity = 1) => set((state) => {
        const existingIndex = state.cart.findIndex(
          item => item.productId === product.id && item.variantLabel === variantLabel
        );

        let price = product.price || 0;
        if (variantLabel && product.variants) {
          price = product.variants.find(v => v.label === variantLabel)?.price || price;
        } else if (product.variants && product.variants.length > 0 && !variantLabel) {
          price = product.variants[0].price;
        }

        if (existingIndex > -1) {
          const newCart = [...state.cart];
          newCart[existingIndex].quantity += quantity;
          return { cart: newCart };
        }

        return {
          cart: [...state.cart, {
            productId: product.id,
            productName: product.name,
            variantLabel,
            price,
            quantity
          }]
        };
      }),

      removeFromCart: (productId, variantLabel) => set((state) => ({
        cart: state.cart.filter(item => !(item.productId === productId && item.variantLabel === variantLabel))
      })),

      updateQuantity: (productId, variantLabel, delta) => set((state) => {
        const newCart = state.cart.map(item => {
          if (item.productId === productId && item.variantLabel === variantLabel) {
            return { ...item, quantity: Math.max(1, item.quantity + delta) };
          }
          return item;
        });
        return { cart: newCart };
      }),

      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'dukaan-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
