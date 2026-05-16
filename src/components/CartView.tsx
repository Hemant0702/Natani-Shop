import { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Gift, Coins, UserPlus, CheckCircle2, Tag } from 'lucide-react';
import { Voucher } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

export function CartView() {
  const { cart, updateQuantity, removeFromCart, clearCart, storeConfig, user, loyaltyStatus, setGlobalLoading } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [pickupNote, setPickupNote] = useState('');
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const { 
    placeOrder, 
    getAvailableVouchers, 
    validateVoucherCode 
  } = useDatabase();
  
  // Checkout state
  const [useStreakCoupon, setUseStreakCoupon] = useState(true);
  const [coinRedemptionAmount, setCoinRedemptionAmount] = useState<number | ''>('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [isReferralApplied, setIsReferralApplied] = useState(false);

  // Voucher state
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{voucher: Voucher, discount: number} | null>(null);

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!user) return;
      const vouchers = await getAvailableVouchers();
      setAvailableVouchers(vouchers);
    };
    fetchVouchers();
  }, [user, subtotal]); // re-fetch or re-validate if subtotal changes maybe? 

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    try {
      const res = await validateVoucherCode(voucherInput, subtotal);
      if (res) {
        setAppliedVoucher(res);
        setVoucherInput('');
      }
    } catch (e: any) {
      alert(e.message || 'Invalid Voucher');
    }
  };

  // --- Calculate Discounts ---
  let totalDiscount = 0;
  let appliedStreakCouponDiscount = 0;
  let appliedSitaraDiscount = 0;
  let appliedCoinDiscount = 0;
  let appliedReferralDiscount = 0;

  // 1. Streak Coupon
  const canUseCoupon = loyaltyStatus?.activeCoupon && subtotal >= loyaltyStatus.activeCoupon.minOrderValue;
  if (canUseCoupon && useStreakCoupon) {
    appliedStreakCouponDiscount = loyaltyStatus.activeCoupon!.discountAmount;
    totalDiscount += appliedStreakCouponDiscount;
  }

  // 2. Sitara Discount (Auto)
  const isSitara = loyaltyStatus?.highestBadge?.key === 'sitara';
  // Assuming the user hasn't used it this month — for frontend preview only, backend is source of truth.
  // We'll show a generic ₹20 off if they are Sitara and backend will handle actual logic.
  // We don't have a direct flag for "used this month" in frontend yet, so we'll optimistically show it.
  // A better approach is to not show it optimistically if we can't be sure, but we can assume they get it for preview.
  // Actually, I'll omit Sitara auto-discount preview for now to avoid confusing users if they already used it.
  // The backend will apply it transparently. Let's just do streak, coins, and referrals.

  // 3. Referral Discount (First order only)
  const isFirstOrder = loyaltyStatus && loyaltyStatus.totalOrders === 0 && !loyaltyStatus.referralUsed;
  const referralDiscountAmount = loyaltyStatus?.settings.streakMilestone ? 10 : 10; // Fallback to 10
  if ((isReferralApplied || loyaltyStatus?.hasReferrer) && isFirstOrder) {
    appliedReferralDiscount = referralDiscountAmount; // optimistic preview
    totalDiscount += appliedReferralDiscount;
  }

  // 4. Coin Redemption
  const maxCoinsToRedeem = Math.min(loyaltyStatus?.coinBalance || 0, Math.max(0, subtotal - totalDiscount));
  const parsedCoins = coinRedemptionAmount === '' ? 0 : Number(coinRedemptionAmount);
  if (parsedCoins > 0 && parsedCoins <= maxCoinsToRedeem && parsedCoins <= (loyaltyStatus?.coinBalance || 0)) {
    appliedCoinDiscount = parsedCoins;
    totalDiscount += appliedCoinDiscount;
  }
  
  // 5. Vouchers
  let appliedVoucherDiscount = 0;
  if (appliedVoucher) {
    // Re-calculate discount in case subtotal changed
    if (appliedVoucher.voucher.discount_type === 'flat') {
      appliedVoucherDiscount = Number(appliedVoucher.voucher.discount_value);
    } else {
      appliedVoucherDiscount = (subtotal * Number(appliedVoucher.voucher.discount_value)) / 100;
      if (appliedVoucher.voucher.max_discount_amount) {
        appliedVoucherDiscount = Math.min(appliedVoucherDiscount, Number(appliedVoucher.voucher.max_discount_amount));
      }
    }
    totalDiscount += appliedVoucherDiscount;
  }

  const finalTotal = Math.max(0, subtotal - totalDiscount);

  const handlePlaceOrder = async () => {
    if (!navigator.onLine) {
      return alert("Aap offline hain. Kripya internet connection check karein.");
    }
    if (!user) return;
    if (storeConfig && !storeConfig.isOpen) {
      return alert(`Dukaan abhi band hai. ${storeConfig.reopenMessage || 'Baad mein try karein.'}`);
    }
    if (storeConfig && subtotal < (storeConfig.minOrderValue || 0)) {
      return alert(`Minimum order Rs. ${storeConfig.minOrderValue} ka hona chahiye`);
    }

    // Validate coins
    if (parsedCoins > 0 && parsedCoins < (loyaltyStatus?.settings.minRedeem || 25)) {
      return alert(`Minimum ${loyaltyStatus?.settings.minRedeem} coins redeem kar sakte hain`);
    }

    setLoading(true);
    setGlobalLoading(true);
    try {
      await placeOrder({
        userId: user.uid,
        customerName: user.fullName,
        customerPhone: user.phoneNumber,
        items: cart,
        total: finalTotal, // frontend calculation just for reference
        status: 'Placed',
        paymentStatus: 'pending',
        pickupSlot: pickupNote || 'Jaldi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        streakCouponId: (canUseCoupon && useStreakCoupon) ? loyaltyStatus.activeCoupon!.id : undefined,
        coinRedemptionAmount: parsedCoins > 0 ? parsedCoins : undefined,
        referralCode: isReferralApplied ? referralCodeInput.toUpperCase() : undefined,
        voucherCode: appliedVoucher?.voucher.code,
      });
      clearCart();
      setPickupNote('');
      setCoinRedemptionAmount('');
      setReferralCodeInput('');
      setIsReferralApplied(false);
      setAppliedVoucher(null);
      alert('✅ Order place ho gaya! Dukaan par aane se pehle status check karein.');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Order place nahi ho paya');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const applyReferralLocally = () => {
    if (!referralCodeInput.trim()) return;
    if (referralCodeInput.toUpperCase() === loyaltyStatus?.referralCode) {
      return alert('Aap apna khud ka code nahi use kar sakte');
    }
    setIsReferralApplied(true);
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
            {item.image_url ? (
              <img src={item.image_url} alt={item.productName} className="h-16 w-16 flex-shrink-0 object-cover rounded-xl border border-gray-100" />
            ) : (
              <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#F7F9FB] text-2xl border border-gray-50">
                 📦
              </div>
            )}
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

      {/* --- Loyalty & Discounts Section --- */}
      {loyaltyStatus && (
        <div className="space-y-3">
          
          {/* Streak Coupon */}
          {loyaltyStatus.activeCoupon && (
            <div className={cn(
              "rounded-2xl p-4 border transition-all",
              canUseCoupon 
                ? (useStreakCoupon ? "bg-green-50/50 border-green-200" : "bg-white border-gray-100") 
                : "bg-gray-50 border-gray-100 opacity-70"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    canUseCoupon ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"
                  )}>
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      ₹{loyaltyStatus.activeCoupon.discountAmount} Streak Coupon
                    </p>
                    <p className="text-[10px] font-bold text-gray-500">
                      Min order {formatCurrency(loyaltyStatus.activeCoupon.minOrderValue)}
                    </p>
                  </div>
                </div>
                {canUseCoupon ? (
                  <button 
                    onClick={() => setUseStreakCoupon(!useStreakCoupon)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all",
                      useStreakCoupon 
                        ? "bg-green-600 text-white shadow-sm" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {useStreakCoupon ? 'Applied' : 'Apply'}
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
                    Add ₹{loyaltyStatus.activeCoupon.minOrderValue - subtotal} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Coin Redemption */}
          {loyaltyStatus.coinBalance >= loyaltyStatus.settings.minRedeem && (
            <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-2xl p-4 border border-amber-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Coins className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Redeem Coins</p>
                  <p className="text-[10px] font-bold text-gray-500">
                    Balance: 🪙 {loyaltyStatus.coinBalance} (Min {loyaltyStatus.settings.minRedeem})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="How many coins?"
                  value={coinRedemptionAmount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value);
                    if (val === '' || (typeof val === 'number' && val >= 0 && val <= maxCoinsToRedeem)) {
                      setCoinRedemptionAmount(val);
                    }
                  }}
                  className="h-12 text-sm font-bold"
                  max={maxCoinsToRedeem}
                  min={0}
                />
                <button
                  onClick={() => setCoinRedemptionAmount(maxCoinsToRedeem)}
                  className="px-4 h-12 bg-amber-200 text-amber-800 rounded-xl text-xs font-black hover:bg-amber-300 transition-all flex-shrink-0"
                >
                  Max (🪙{maxCoinsToRedeem})
                </button>
              </div>
            </div>
          )}

          {/* Referral Input (Only for first order) */}
          {isFirstOrder && !loyaltyStatus.hasReferrer && (
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Have a Referral Code?</p>
                  <p className="text-[10px] font-bold text-gray-500">Get ₹10 off your first order!</p>
                </div>
              </div>
              {!isReferralApplied ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter Code"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    className="h-12 uppercase font-mono tracking-widest text-sm"
                    maxLength={6}
                  />
                  <button
                    onClick={applyReferralLocally}
                    disabled={referralCodeInput.length < 6}
                    className="px-4 h-12 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 disabled:opacity-50 transition-all flex-shrink-0"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="h-12 bg-green-100 rounded-xl flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-mono text-sm font-black text-green-800 tracking-widest">{referralCodeInput}</span>
                  </div>
                  <button onClick={() => setIsReferralApplied(false)} className="text-[10px] font-bold text-red-500 uppercase">
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {isFirstOrder && loyaltyStatus.hasReferrer && (
            <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Referral Discount Applied!</p>
                  <p className="text-[10px] font-bold text-gray-500">₹10 off your first order</p>
                </div>
              </div>
            </div>
          )}

          {/* Vouchers Section */}
          <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Tag className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Vouchers & Offers</p>
                {availableVouchers.length > 0 ? (
                  <p className="text-[10px] font-bold text-gray-500">{availableVouchers.length} available for you</p>
                ) : (
                  <p className="text-[10px] font-bold text-gray-400">no voucher available right now</p>
                )}
              </div>
            </div>

            {!appliedVoucher ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Voucher Code"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  className="h-12 uppercase font-mono tracking-widest text-sm"
                />
                <button
                  onClick={handleApplyVoucher}
                  disabled={!voucherInput.trim()}
                  className="px-4 h-12 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 disabled:opacity-50 transition-all flex-shrink-0"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="h-12 bg-purple-100 rounded-xl flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-black text-purple-800 tracking-widest">{appliedVoucher.voucher.code}</span>
                    <span className="text-[8px] font-bold text-purple-600">₹{appliedVoucherDiscount} discount applied</span>
                  </div>
                </div>
                <button onClick={() => setAppliedVoucher(null)} className="text-[10px] font-bold text-red-500 uppercase">
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}


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
          
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-gray-500">Subtotal</span>
            <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
          </div>

          {appliedStreakCouponDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span className="font-bold">Streak Coupon</span>
              <span className="font-bold">- {formatCurrency(appliedStreakCouponDiscount)}</span>
            </div>
          )}

          {appliedReferralDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-blue-600">
              <span className="font-bold">Referral Discount</span>
              <span className="font-bold">- {formatCurrency(appliedReferralDiscount)}</span>
            </div>
          )}

          {appliedCoinDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-amber-600">
              <span className="font-bold">Coins Redeemed (🪙{appliedCoinDiscount})</span>
              <span className="font-bold">- {formatCurrency(appliedCoinDiscount)}</span>
            </div>
          )}

          {appliedVoucherDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-purple-600">
              <span className="font-bold">Voucher Discount</span>
              <span className="font-bold">- {formatCurrency(appliedVoucherDiscount)}</span>
            </div>
          )}

          <div className="h-[1px] bg-gray-100 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-gray-900">Total</span>
            <span className="text-xl font-black text-[#06833E]">{formatCurrency(finalTotal)}</span>
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
          Order Place Karein • {formatCurrency(finalTotal)}
        </Button>
      </div>
    </div>
  );
}
