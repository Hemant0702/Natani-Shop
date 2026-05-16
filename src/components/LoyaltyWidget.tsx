import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useDatabase } from '../hooks/useDatabase';
import { LoyaltyDashboard } from './LoyaltyDashboard';
import { motion, AnimatePresence } from 'framer-motion';

export function LoyaltyWidget() {
  const { user, loyaltyStatus, setLoyaltyStatus } = useAppStore();
  const { getLoyaltyStatus } = useDatabase();
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchStatus = async () => {
      const status = await getLoyaltyStatus();
      if (status) setLoyaltyStatus(status);
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  // Don't show for admin or when not logged in
  if (!user || user.role === 'admin') return null;

  const coinBalance = loyaltyStatus?.coinBalance ?? user.rewardPoints ?? 0;
  const streak = loyaltyStatus?.streak;
  const highestBadge = loyaltyStatus?.highestBadge;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setShowDashboard(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 shadow-sm hover:bg-amber-100 transition-all active:scale-95"
      >
        {streak && streak.currentStreak > 0 && (
          <span className="text-[11px] font-black text-orange-600">🔥{streak.currentStreak}</span>
        )}
        <span className="text-xs font-black text-amber-700">🪙 {coinBalance}</span>
        {highestBadge && (
          <span className="text-sm">{highestBadge.emoji}</span>
        )}
      </motion.button>

      <AnimatePresence>
        {showDashboard && (
          <LoyaltyDashboard onClose={() => setShowDashboard(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
