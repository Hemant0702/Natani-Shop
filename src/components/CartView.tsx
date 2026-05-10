import { useState } from 'react';
import { Trash2, Plus, Minus, Clock, ShoppingBag } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, cn } from '../lib/utils';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';

const SLOTS = [
  { id: '5-10', label: '5-10 minutes', note: 'Sirf tab jab dukaan khuli ho' },
  { id: '30', label: '30 minutes', note: 'Taiyari ka time' },
  { id: '60', label: '1 ghanta', note: 'Bad mein aayenge' },
  { id: '5pm', label: 'Shaam 5 baje', note: 'Kaam ke baad' },
];

export function CartView() {
  const { cart, updateQuantity, removeFromCart, clearCart, storeConfig, user } = useAppStore();
  const { placeOrder } = useDatabase();
  const [selectedSlot, setSelectedSlot] = useState(SLOTS[1].id);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const minOrder = storeConfig?.minOrderValue || 50;
  const isMinMet = subtotal >= minOrder;
  const storeOpen = storeConfig?.isOpen || false;

  const handlePlaceOrder = async () => {
    if (!isMinMet || !storeOpen || !user) return;
    setLoading(true);
    try {
      await placeOrder({
        userId: user.uid,
        customerName: user.fullName,
        customerPhone: user.phoneNumber,
        items: cart,
        total: subtotal,
        status: 'Placed',
        pickupSlot: SLOTS.find(s => s.id === selectedSlot)?.label || '30 minutes',
        ownerNote: notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      clearCart();
      
      const message = `Namaste Malik! Mera naya order aaya hai.\nNaam: ${user.fullName}\nPhone: ${user.phoneNumber}\nTotal: Rs. ${subtotal}\nPickup: ${SLOTS.find(s => s.id === selectedSlot)?.label}\nSaman:\n${cart.map(i => `${i.quantity}x ${i.productName}`).join('\n')}`;
      const ownerPhone = storeConfig?.storeInfo.phone || '9999999999';
      
      if (confirm('Order de diya gaya hai! Kya aap WhatsApp par malik ko message bhejna chahte hain?')) {
        window.open(`https://wa.me/91${ownerPhone}?text=${encodeURIComponent(message)}`, '_blank');
      } else {
        alert('Order de diya gaya hai! status check karein');
      }
    } catch (e) {
      console.error(e);
      alert('Order dene mein dikat aayi');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="h-32 w-32 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-5xl">
          🛍️
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Aapka thaila khali hai</h2>
          <p className="text-sm text-gray-500 font-medium">Bazaar se kuch achha mangwaien</p>
        </div>
        <Button onClick={() => window.location.reload()} className="bg-yellow-400 text-black border border-yellow-500 hover:bg-yellow-500">Shopping Karo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-40">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Checkout</h2>
        <button onClick={clearCart} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-600 underline">Clear All</button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {cart.map((item) => (
            <div key={`${item.productId}-${item.variantLabel}`} className="p-4 flex items-center gap-4">
              <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-2xl bg-gray-50 text-2xl">
                 📦
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-gray-900 truncate">{item.productName}</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{item.variantLabel || 'Single Pack'}</p>
                <p className="text-sm font-black text-gray-900 mt-1">{formatCurrency(item.price)}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center rounded-xl bg-orange-600/10 p-1">
                  <button 
                    onClick={() => updateQuantity(item.productId, item.variantLabel, -1)}
                    className="rounded-lg p-1 text-orange-600 hover:bg-orange-100"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center font-black text-sm text-orange-700">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.productId, item.variantLabel, 1)}
                    className="rounded-lg p-1 text-orange-600 hover:bg-orange-100"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.productId, item.variantLabel)}
                  className="text-[10px] font-black text-gray-400 uppercase hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5 shadow-sm">
        <h4 className="flex items-center gap-2 text-sm font-black text-gray-900">
          <Clock className="h-4 w-4 text-yellow-600" /> Kab tak aayenge?
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {(storeOpen ? SLOTS : SLOTS.filter(s => s.id !== '5-10')).map(slot => (
            <button
              key={slot.id}
              onClick={() => setSelectedSlot(slot.id)}
              className={cn(
                "rounded-2xl border-2 p-4 text-left transition-all",
                selectedSlot === slot.id 
                  ? "border-yellow-400 bg-yellow-50" 
                  : "border-gray-50 hover:bg-gray-50"
              )}
            >
              <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSlot === slot.id ? "text-yellow-700" : "text-gray-400")}>
                {slot.label}
              </p>
              <p className="text-sm font-black text-gray-900 mt-0.5">{slot.note || 'Aaj hi'}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Kuch kehna hai? (Optional)</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jaise: Saman dhile pack karna..."
          className="w-full rounded-3xl border-gray-100 bg-white p-5 text-sm font-medium focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-sm"
          rows={3}
        />
      </div>

      <div className="fixed bottom-24 left-4 right-4 z-50">
        <div className="max-w-lg mx-auto bg-white rounded-[2.5rem] p-5 shadow-2xl border flex items-center gap-6 ring-8 ring-[#F7F9FB]">
          <div className="flex-1">
             <div className="flex items-center gap-1">
               <span className="text-2xl font-black text-gray-900">{formatCurrency(subtotal)}</span>
             </div>
             <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-0.5">Sare packing charges FREE</p>
          </div>

          <Button
            disabled={!isMinMet || !storeOpen}
            loading={loading}
            onClick={handlePlaceOrder}
            className={cn(
              "flex-1 h-16 rounded-2xl text-lg font-black uppercase tracking-tight shadow-xl",
              isMinMet ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-gray-200 text-gray-400 grayscale"
            )}
          >
            {isMinMet ? 'Order Karein' : `Add Rs. ${minOrder - subtotal}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
