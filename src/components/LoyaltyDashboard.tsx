import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency, cn } from '../lib/utils';
import { X, Copy, Check, Gift, Flame, Award, Coins, Share2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onClose: () => void;
}

export function LoyaltyDashboard({ onClose }: Props) {
  const { loyaltyStatus, user } = useAppStore();
  const [copiedCode, setCopiedCode] = useState(false);

  if (!loyaltyStatus || !user) return null;

  const { streak, badges, highestBadge, coinBalance, referralCode, referralUsed, activeCoupon, totalOrders, nextBadge, recentTransactions, settings } = loyaltyStatus;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `ApniDukan se order karo aur mere code *${referralCode}* use karke ₹10 ka discount pao! 🎉\n\nhttps://apnidukan.vercel.app`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Determine streak message
  const getStreakMessage = () => {
    if (!streak.lastOrderDate) return 'Aaj pehla order karein aur streak shuru karein!';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastDate = streak.lastOrderDate;
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (lastDate === todayStr) return '✅ Aaj ka order ho gaya! Kal bhi karein!';
    if (lastDate === yesterdayStr) return '⚡ Aaj order karein streak bachane ke liye!';
    return '😢 Streak toot gaya. Aaj se naya shuru karein!';
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 z-[90] w-full max-w-sm bg-white shadow-2xl overflow-hidden"
      >
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-[#06833E] via-[#0a9e4d] to-[#06833E] p-6 pb-8 text-white flex-shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl backdrop-blur-sm">
                {highestBadge?.emoji || '🌱'}
              </div>
              <div>
                <h2 className="text-lg font-black">{user.fullName}</h2>
                <p className="text-xs font-bold text-white/70">
                  {highestBadge ? highestBadge.label : 'New Customer'} • {totalOrders} orders
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-2xl font-black">🔥 {streak.currentStreak}</p>
                <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Streak</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-2xl font-black">🪙 {coinBalance}</p>
                <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Coins</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-2xl font-black">📦 {totalOrders}</p>
                <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Orders</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-5 space-y-5">
            
            {/* Badge Progress */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Badge Progress</h3>
              </div>

              {/* Earned badges */}
              <div className="flex gap-2 flex-wrap">
                {badges.map((b) => (
                  <div key={b.badgeKey} className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
                    <span className="text-sm">{b.emoji}</span>
                    <span className="text-[10px] font-bold text-amber-800">{b.label}</span>
                  </div>
                ))}
                {badges.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Abhi tak koi badge nahi mila</p>
                )}
              </div>

              {/* Next badge progress */}
              {nextBadge && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500">
                      Next: {nextBadge.emoji} {nextBadge.label}
                    </span>
                    <span className="text-[10px] font-black text-[#06833E]">
                      {nextBadge.ordersNeeded} more order{nextBadge.ordersNeeded !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#06833E] to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((totalOrders / nextBadge.orderThreshold) * 100))}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Streak Section */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100/60 space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Order Streak</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-black text-orange-600">{streak.currentStreak}</p>
                  <p className="text-[9px] font-bold text-orange-400 uppercase">Days</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700">{getStreakMessage()}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {settings.streakMilestone} din streak pe ₹5 ka coupon milega!
                  </p>
                  {streak.longestStreak > 0 && (
                    <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                      🏆 Best: {streak.longestStreak} days
                    </p>
                  )}
                </div>
              </div>
              
              {/* Active coupon */}
              {activeCoupon && (
                <div className="mt-2 bg-white rounded-xl p-3 border border-green-100 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-800">
                      {formatCurrency(activeCoupon.discountAmount)} off — active coupon!
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Min order {formatCurrency(activeCoupon.minOrderValue)} • Expires {new Date(activeCoupon.expiresAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Coins Section */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-4 border border-yellow-100/60 space-y-2">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-600" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Coins</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black text-amber-700">🪙 {coinBalance}</p>
                  <p className="text-[10px] text-gray-500">1 coin = ₹1 discount</p>
                </div>
                <div className="text-right">
                  {coinBalance >= settings.minRedeem ? (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      ✅ Redeem ready!
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400">
                      {settings.minRedeem - coinBalance} more to redeem
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Referral Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100/60 space-y-3">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Refer & Earn</h3>
              </div>
              <p className="text-xs text-gray-600">
                Apna code share karein — dost ko ₹10 off aur aapko 🪙10 coins milenge!
              </p>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-blue-200 font-mono text-lg font-black text-blue-800 text-center tracking-[0.3em]">
                  {referralCode}
                </div>
                <button
                  onClick={copyReferralCode}
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                    copiedCode ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {copiedCode ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>

              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-bold text-sm transition-all active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp pe Share karein
              </button>
            </div>

            {/* Transaction History */}
            {recentTransactions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Recent Coin Activity</h3>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-sm",
                          tx.amount > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {tx.amount > 0 ? '+' : '-'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">
                            {tx.type === 'order_earn' ? 'Order Reward' :
                             tx.type === 'referral_credit' ? 'Referral Bonus' :
                             tx.type === 'redemption' ? 'Redeemed' :
                             'Admin Adjustment'}
                          </p>
                          {tx.note && <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{tx.note}</p>}
                        </div>
                      </div>
                      <span className={cn(
                        "text-sm font-black",
                        tx.amount > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
