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

  if (!loyaltyStatus) return null;

  const { streak, coinBalance, highestBadge } = loyaltyStatus;

  return (
    <>
      <button
        onClick={() => setShowDashboard(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/60 hover:border-amber-200 transition-all active:scale-95"
      >
        {streak.currentStreak > 0 && (
          <span className="text-[11px] font-black text-orange-600">🔥{streak.currentStreak}</span>
        )}
        <span className="text-[11px] font-black text-amber-700">🪙{coinBalance}</span>
        <span className="text-[11px] font-black text-purple-600">✨{loyaltyStatus.rewardPoints}</span>
        {highestBadge && (
          <span className="text-[11px]">{highestBadge.emoji}</span>
        )}
      </button>

      <AnimatePresence>
        {showDashboard && (
          <LoyaltyDashboard onClose={() => setShowDashboard(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
