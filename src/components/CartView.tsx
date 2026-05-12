import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { motion } from 'framer-motion';
import { PRODUCT_CATEGORIES } from '../lib/constants';

export function CartView() {
  const { cart, updateQuantity, removeFromCart, clearCart, storeConfig, user, setGlobalLoading } = useAppStore();
  const { placeOrder } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [pickupNote, setPickupNote] = useState('');

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal;

  const handlePlaceOrder = async () => {
    if (!user) return;
    if (storeConfig && !storeConfig.isOpen) {
      return alert(`Dukaan abhi band hai. ${storeConfig.reopenMessage || 'Baad mein try karein.'}`);
    }
    if (storeConfig && subtotal < (storeConfig.minOrderValue || 0)) {
      return alert(`Minimum order Rs. ${storeConfig.minOrderValue} ka hona chahiye`);
    }
    setLoading(true);
    setGlobalLoading(true);
    try {
      await placeOrder({
        userId: user.uid,
        customerName: user.fullName,
        customerPhone: user.phoneNumber,
        items: cart,
        total: total,
        status: 'Placed',
        paymentStatus: 'pending',
        pickupSlot: pickupNote || 'Jaldi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      clearCart();
      setPickupNote('');
      alert('✅ Order place ho gaya! Dukaan par aane se pehle status check karein.');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Order place nahi ho paya');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="h-28 w-28 rounded-full bg-[#E6F3EC] flex items-center justify-center text-5xl">
          🛍️
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cart khaali hai</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Kuch saman add karein</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900">Cart</h2>
        <button onClick={clearCart} className="text-xs font-bold text-red-500 hover:text-red-600 transition-all">
          Clear All
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-3">
        {cart.map((item) => (
          <motion.div 
            key={`${item.productId}-${item.variantLabel}`} 
            layout
            className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-50"
          >
            <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#F7F9FB] text-2xl">
               📦
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-800 truncate">{item.productName}</h4>
              {item.variantLabel && (
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.variantLabel}</p>
              )}
              <p className="text-sm font-black text-[#06833E] mt-1">{formatCurrency(item.price * item.quantity)}</p>
              <p className="text-[10px] font-bold text-gray-400">{formatCurrency(item.price)} × {item.quantity}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={() => removeFromCart(item.productId, item.variantLabel)}
                className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-2 bg-[#06833E] text-white rounded-full p-1 px-1.5 shadow-sm">
                <button 
                  onClick={() => updateQuantity(item.productId, item.variantLabel, -1)}
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-white/20"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.productId, item.variantLabel, 1)}
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-white/20"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pickup Note */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Note (Optional)</label>
        <Input 
          placeholder="E.g. 5 baje aaunga, thoda jaldi pack karo"
          value={pickupNote}
          onChange={(e) => setPickupNote(e.target.value)}
          className="h-10 text-xs"
        />
      </div>

      {/* Bill Summary */}
      <div className="bg-white rounded-2xl p-5 space-y-3 shadow-sm border border-gray-50">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Bill Summary</h3>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={`${item.productId}-${item.variantLabel}`} className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-600 truncate mr-2">
                {item.productName} {item.variantLabel ? `(${item.variantLabel})` : ''} × {item.quantity}
              </span>
              <span className="font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="h-[1px] bg-gray-100 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-gray-900">Total</span>
            <span className="text-xl font-black text-[#06833E]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="fixed bottom-24 left-4 right-4 z-50 max-w-lg mx-auto">
        <Button
          loading={loading}
          onClick={handlePlaceOrder}
          disabled={cart.length === 0}
          className="w-full h-14 rounded-full bg-[#06833E] text-white text-base font-bold shadow-xl shadow-[#06833E]/20 hover:bg-[#008037] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-5 w-5" />
          Order Place Karein • {formatCurrency(total)}
        </Button>
      </div>
    </div>
  );
}
