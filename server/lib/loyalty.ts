import { supabaseAdmin } from './supabase';

// ─── Reward Points Logic ────────────────────────────────────────────────
export function calculateRewardPoints(amount: number): number {
  if (amount < 100) return 0;
  if (amount <= 250) return 0.25;
  if (amount <= 500) return 0.50;
  if (amount <= 750) return 1.5;
  if (amount <= 1000) return 3;
  if (amount <= 1500) return 5;
  if (amount <= 2000) return 7;
  return 8;
}

export async function awardRewardPointsForOrder(orderId: string, userId: string, amount: number): Promise<void> {
  const points = calculateRewardPoints(amount);
  if (points <= 0) return;

  // Idempotency: check if already awarded
  const { data: existing } = await supabaseAdmin
    .from('reward_transactions')
    .select('id')
    .eq('orderId', orderId)
    .eq('type', 'earn')
    .maybeSingle();

  if (existing) return;

  // Award points atomically
  await supabaseAdmin.rpc('update_reward_points', { p_user_id: userId, p_delta: points });

  // Record transaction
  await supabaseAdmin
    .from('reward_transactions')
    .insert({
      userId,
      type: 'earn',
      points,
      orderId,
      note: `Earned for order ₹${amount}`,
    });
}

// ─── Types ──────────────────────────────────────────────────────────────
interface LoyaltySettings {
  streak: {
    milestone_days: number;
    bonus_amount: number;
    min_order_value: number;
    coupon_expiry_days: number;
  };
  badges: Array<{
    badge_key: string;
    label: string;
    emoji: string;
    order_threshold: number;
    unlock_type: string;
    discount_amount: number | null;
    is_active: boolean;
  }>;
  referral: {
    new_customer_discount: number;
    min_order_new_customer: number;
    referrer_reward_coins: number;
    min_order_referrer_reward: number;
  };
  coins: {
    milestones: Array<{ threshold: number; coins: number }>;
    min_redeem: number;
  };
}

const DEFAULT_SETTINGS: LoyaltySettings = {
  streak: { milestone_days: 3, bonus_amount: 5, min_order_value: 200, coupon_expiry_days: 7 },
  badges: [
    { badge_key: 'naya_grahak', label: 'Naya Grahak', emoji: '🌱', order_threshold: 1, unlock_type: 'welcome', discount_amount: null, is_active: true },
    { badge_key: 'pakka_grahak', label: 'Pakka Grahak', emoji: '⭐', order_threshold: 5, unlock_type: 'priority', discount_amount: null, is_active: true },
    { badge_key: 'vishwaspatri', label: 'Vishwaspatri', emoji: '🏅', order_threshold: 15, unlock_type: 'public_display', discount_amount: null, is_active: true },
    { badge_key: 'sitara', label: 'Dukan ka Sitara', emoji: '👑', order_threshold: 30, unlock_type: 'monthly_discount', discount_amount: 20, is_active: true },
  ],
  referral: { new_customer_discount: 10, min_order_new_customer: 150, referrer_reward_coins: 10, min_order_referrer_reward: 200 },
  coins: { milestones: [{ threshold: 500, coins: 2 }, { threshold: 1000, coins: 5 }, { threshold: 2000, coins: 8 }], min_redeem: 25 },
};

// ─── Settings ───────────────────────────────────────────────────────────
let cachedSettings: LoyaltySettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  if (cachedSettings && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }
  const { data } = await supabaseAdmin
    .from('loyalty_settings')
    .select('*')
    .eq('id', 'main')
    .single();

  if (data) {
    cachedSettings = {
      streak: data.streak as LoyaltySettings['streak'],
      badges: data.badges as LoyaltySettings['badges'],
      referral: data.referral as LoyaltySettings['referral'],
      coins: data.coins as LoyaltySettings['coins'],
    };
  } else {
    cachedSettings = DEFAULT_SETTINGS;
  }
  cacheTimestamp = Date.now();
  return cachedSettings;
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

export async function updateLoyaltySettings(settings: any): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('loyalty_settings')
    .update({
      streak: settings.streak,
      badges: settings.badges,
      referral: settings.referral,
      coins: settings.coins,
    })
    .eq('id', 'main');
  
  if (!error) invalidateSettingsCache();
  return !error;
}


// ─── Referral Code Generation ───────────────────────────────────────────
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    const { data } = await supabaseAdmin
      .from('users')
      .select('uid')
      .eq('referral_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  // Fallback: timestamp-based
  return generateReferralCode() + Date.now().toString(36).slice(-2).toUpperCase();
}

// ─── Streak Logic ───────────────────────────────────────────────────────
export async function updateStreakForUser(userId: string, orderId: string): Promise<void> {
  const settings = await getLoyaltySettings();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get or create streak record
  let { data: streak } = await supabaseAdmin
    .from('customer_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!streak) {
    const { data: newStreak } = await supabaseAdmin
      .from('customer_streaks')
      .insert({ user_id: userId, current_streak: 0, longest_streak: 0, last_order_date: null })
      .select()
      .single();
    streak = newStreak;
  }

  if (!streak) return;

  // Idempotent: if last_order_date is already today, do nothing
  if (streak.last_order_date === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak: number;
  if (streak.last_order_date === yesterdayStr) {
    newStreak = streak.current_streak + 1;
  } else {
    newStreak = 1; // reset
  }

  const longestStreak = Math.max(newStreak, streak.longest_streak);

  await supabaseAdmin
    .from('customer_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_order_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Check if milestone hit
  if (newStreak > 0 && newStreak % settings.streak.milestone_days === 0) {
    // Award streak coupon
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.streak.coupon_expiry_days);

    await supabaseAdmin
      .from('streak_coupons')
      .insert({
        user_id: userId,
        discount_amount: settings.streak.bonus_amount,
        min_order_value: settings.streak.min_order_value,
        is_used: false,
        expires_at: expiresAt.toISOString(),
      });
  }
}

// ─── Badge Logic ────────────────────────────────────────────────────────
export async function checkAndAwardBadges(userId: string, _orderId: string): Promise<void> {
  const settings = await getLoyaltySettings();

  // Count total orders for user
  const { count } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('userId', userId)
    .neq('status', 'Cancelled');

  const totalOrders = count || 0;

  // Get already earned badges
  const { data: earnedBadges } = await supabaseAdmin
    .from('customer_badges')
    .select('badge_key')
    .eq('user_id', userId);

  const earnedKeys = new Set((earnedBadges || []).map(b => b.badge_key));

  // Check each badge tier
  for (const badge of settings.badges) {
    if (!badge.is_active) continue;
    if (earnedKeys.has(badge.badge_key)) continue;
    if (totalOrders >= badge.order_threshold) {
      // Award badge — use upsert for idempotency
      await supabaseAdmin
        .from('customer_badges')
        .upsert(
          {
            user_id: userId,
            badge_key: badge.badge_key,
            earned_at: new Date().toISOString(),
            total_orders_at_earn: totalOrders,
          },
          { onConflict: 'user_id,badge_key' }
        );
    }
  }
}

// ─── Coin Logic ─────────────────────────────────────────────────────────
export async function checkAndAwardCoins(userId: string, orderId: string): Promise<void> {
  const settings = await getLoyaltySettings();

  // Calculate cumulative spend for this user (only paid orders)
  const { data: paidOrders } = await supabaseAdmin
    .from('orders')
    .select('total')
    .eq('userId', userId)
    .eq('paymentStatus', 'collected')
    .neq('status', 'Cancelled');

  const cumulativeSpend = (paidOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);

  // Get already awarded milestones
  const { data: awardedMilestones } = await supabaseAdmin
    .from('coin_spend_milestones_log')
    .select('milestone_rupee_threshold')
    .eq('user_id', userId);

  const awardedSet = new Set((awardedMilestones || []).map(m => m.milestone_rupee_threshold));

  // Sort milestones by threshold ascending
  const sortedMilestones = [...settings.coins.milestones].sort((a, b) => a.threshold - b.threshold);

  for (const milestone of sortedMilestones) {
    // Check all multiples of each threshold up to cumulative spend
    // e.g., if threshold=500 and spend=1200, award for 500 and 1000
    const timesReached = Math.floor(cumulativeSpend / milestone.threshold);
    for (let i = 1; i <= timesReached; i++) {
      const milestoneValue = milestone.threshold * i;
      if (awardedSet.has(milestoneValue)) continue;

      // Award coins — use milestone log to prevent duplicates
      const { error: logError } = await supabaseAdmin
        .from('coin_spend_milestones_log')
        .insert({
          user_id: userId,
          milestone_rupee_threshold: milestoneValue,
          coins_awarded: milestone.coins,
          order_id: orderId,
        });

      // If insert fails (unique constraint), skip — already awarded
      if (logError) continue;

      // Credit coins
      await supabaseAdmin
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: milestone.coins,
          type: 'order_earn',
          order_id: orderId,
          note: `Milestone: ₹${milestoneValue} cumulative spend`,
        });

      awardedSet.add(milestoneValue);
    }
  }
}

// ─── Coin Balance ───────────────────────────────────────────────────────
export async function getCoinBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .rpc('get_coin_balance', { p_user_id: userId });
  return data || 0;
}

// ─── Coin Redemption ────────────────────────────────────────────────────
export async function validateCoinRedemption(userId: string, amount: number): Promise<boolean> {
  const settings = await getLoyaltySettings();
  if (amount < settings.coins.min_redeem) return false;

  const balance = await getCoinBalance(userId);
  if (balance < amount) return false;

  return true;
}

export async function redeemCoins(userId: string, amount: number, orderId: string): Promise<boolean> {
  const isValid = await validateCoinRedemption(userId, amount);
  if (!isValid) return false;

  // Check idempotency — has this order already had a redemption?
  const { data: existing } = await supabaseAdmin
    .from('coin_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('order_id', orderId)
    .eq('type', 'redemption')
    .maybeSingle();

  if (existing) return false; // Already redeemed for this order

  await supabaseAdmin
    .from('coin_transactions')
    .insert({
      user_id: userId,
      amount: -amount, // negative = debit
      type: 'redemption',
      order_id: orderId,
      note: `Redeemed ₹${amount} on order`,
    });

  return true;
}

// ─── Streak Coupons ─────────────────────────────────────────────────────
export async function getValidStreakCoupon(userId: string) {
  const now = new Date().toISOString();
  const { data } = await supabaseAdmin
    .from('streak_coupons')
    .select('*')
    .eq('user_id', userId)
    .eq('is_used', false)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function applyStreakCoupon(couponId: string, orderId: string): Promise<boolean> {
  const { data: coupon } = await supabaseAdmin
    .from('streak_coupons')
    .select('*')
    .eq('id', couponId)
    .eq('is_used', false)
    .single();

  if (!coupon) return false;
  if (new Date(coupon.expires_at) < new Date()) return false;

  await supabaseAdmin
    .from('streak_coupons')
    .update({ is_used: true, order_id: orderId })
    .eq('id', couponId);

  return true;
}

// ─── Referral Logic ─────────────────────────────────────────────────────
export async function validateReferral(
  referredUserId: string,
  referralCode: string,
  orderTotal: number
): Promise<{ discount: number, referrerId: string } | null> {
  const settings = await getLoyaltySettings();

  // Check if user already used a referral
  const { data: referredUser } = await supabaseAdmin
    .from('users')
    .select('uid, referral_code, referral_used')
    .eq('uid', referredUserId)
    .single();

  if (!referredUser || referredUser.referral_used) return null;

  // Prevent self-referral
  if (referredUser.referral_code === referralCode) return null;

  // Find referrer
  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('uid')
    .eq('referral_code', referralCode)
    .single();

  if (!referrer) return null;

  // Check order meets minimum
  if (orderTotal < settings.referral.min_order_new_customer) return null;

  return { 
    discount: settings.referral.new_customer_discount,
    referrerId: referrer.uid
  };
}

export async function processReferral(
  referredUserId: string,
  referralCode: string,
  orderId: string,
  orderTotal: number
): Promise<{ referralDiscount: number } | null> {
  const settings = await getLoyaltySettings();
  
  const validation = await validateReferral(referredUserId, referralCode, orderTotal);
  if (!validation) return null;

  // Check idempotency
  const { data: existingTx } = await supabaseAdmin
    .from('referral_transactions')
    .select('id')
    .eq('referred_user_id', referredUserId)
    .maybeSingle();

  if (existingTx) return null;

  // Create referral transaction
  await supabaseAdmin
    .from('referral_transactions')
    .insert({
      referrer_user_id: validation.referrerId,
      referred_user_id: referredUserId,
      order_id: orderId,
      referrer_reward_coins: settings.referral.referrer_reward_coins,
      referred_discount_amount: settings.referral.new_customer_discount,
    });

  // Mark referred user
  await supabaseAdmin
    .from('users')
    .update({ referral_used: true, referred_by: validation.referrerId })
    .eq('uid', referredUserId);

  return { referralDiscount: settings.referral.new_customer_discount };
}

export async function awardPendingReferralRewards(orderId: string): Promise<void> {
  const settings = await getLoyaltySettings();

  // Find pending referral rewards for this order
  const { data: tx } = await supabaseAdmin
    .from('referral_transactions')
    .select('*, referred_user:referred_user_id(fullName)')
    .eq('order_id', orderId)
    .eq('referrer_reward_given', false)
    .maybeSingle();

  if (!tx) return;

  // Credit referrer
  await supabaseAdmin
    .from('coin_transactions')
    .insert({
      user_id: tx.referrer_user_id,
      amount: tx.referrer_reward_coins,
      type: 'referral_credit',
      order_id: orderId,
      note: `Referral reward: friend's order paid`,
    });

  // Mark as given
  await supabaseAdmin
    .from('referral_transactions')
    .update({ referrer_reward_given: true })
    .eq('id', tx.id);

  // Notify referrer
  try {
    const title = 'Referral Coins Added! 🪙';
    const message = `Payment for ${tx.referred_user?.fullName || 'a friend'}'s order is confirmed. You earned ${tx.referrer_reward_coins} coins!`;
    
    await supabaseAdmin.from('notifications').insert({
      user_id: tx.referrer_user_id,
      order_id: orderId,
      title,
      message,
      type: 'referral_reward',
    });
  } catch (e) {
    console.error('Referrer notification error:', e);
  }
}


// ─── Full Loyalty Status (for customer) ─────────────────────────────────
export async function getFullLoyaltyStatus(userId: string) {
  const settings = await getLoyaltySettings();

  // Parallel fetches
  const [
    streakRes,
    badgesRes,
    balanceRes,
    userRes,
    couponRes,
    orderCountRes,
    transactionsRes,
  ] = await Promise.all([
    supabaseAdmin.from('customer_streaks').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('customer_badges').select('*').eq('user_id', userId).order('earned_at', { ascending: true }),
    getCoinBalance(userId),
    supabaseAdmin.from('users').select('referral_code, referral_used, referred_by, rewardPoints').eq('uid', userId).maybeSingle(),
    getValidStreakCoupon(userId),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('userId', userId).neq('status', 'Cancelled'),
    supabaseAdmin.from('coin_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
  ]);

  const streak = streakRes.data || { current_streak: 0, longest_streak: 0, last_order_date: null };
  const badges = badgesRes.data || [];
  const coinBalance = balanceRes;
  let user = userRes.data;
  const activeCoupon = couponRes;
  const totalOrders = orderCountRes.count || 0;
  const recentTransactions = transactionsRes.data || [];

  // Auto-generate referral code for legacy users
  if (user && !user.referral_code) {
    const newCode = await generateUniqueReferralCode();
    await supabaseAdmin.from('users').update({ referral_code: newCode }).eq('uid', userId);
    user.referral_code = newCode;
  }

  // Calculate next badge
  const earnedKeys = new Set(badges.map((b: any) => b.badge_key));
  const sortedBadges = [...settings.badges].sort((a, b) => a.order_threshold - b.order_threshold);
  const nextBadge = sortedBadges.find(b => b.is_active && !earnedKeys.has(b.badge_key) && b.order_threshold > totalOrders);

  // Find highest earned badge for display
  const highestBadge = sortedBadges
    .filter(b => earnedKeys.has(b.badge_key))
    .pop();

  return {
    streak: {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastOrderDate: streak.last_order_date,
    },
    badges: badges.map((b: any) => ({
      badgeKey: b.badge_key,
      earnedAt: b.earned_at,
      totalOrdersAtEarn: b.total_orders_at_earn,
      ...settings.badges.find(sb => sb.badge_key === b.badge_key),
    })),
    highestBadge: highestBadge ? {
      key: highestBadge.badge_key,
      label: highestBadge.label,
      emoji: highestBadge.emoji,
    } : null,
    coinBalance,
    rewardPoints: user?.rewardPoints || 0,
    referralCode: user?.referral_code || '',
    referralUsed: user?.referral_used || false,
    hasReferrer: !!user?.referred_by,
    activeCoupon: activeCoupon ? {
      id: activeCoupon.id,
      discountAmount: activeCoupon.discount_amount,
      minOrderValue: activeCoupon.min_order_value,
      expiresAt: activeCoupon.expires_at,
    } : null,
    totalOrders,
    nextBadge: nextBadge ? {
      key: nextBadge.badge_key,
      label: nextBadge.label,
      emoji: nextBadge.emoji,
      ordersNeeded: nextBadge.order_threshold - totalOrders,
      orderThreshold: nextBadge.order_threshold,
    } : null,
    recentTransactions: recentTransactions.map((t: any) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      note: t.note,
      createdAt: t.created_at,
    })),
    settings: {
      streakMilestone: settings.streak.milestone_days,
      minRedeem: settings.coins.min_redeem,
    },
  };
}

// ─── Featured Customers ─────────────────────────────────────────────────
export async function getFeaturedCustomers() {
  const settings = await getLoyaltySettings();
  const featuredBadgeKeys = settings.badges
    .filter(b => b.unlock_type === 'public_display' || b.unlock_type === 'monthly_discount')
    .map(b => b.badge_key);

  if (featuredBadgeKeys.length === 0) return [];

  const { data: badges } = await supabaseAdmin
    .from('customer_badges')
    .select('user_id, badge_key')
    .in('badge_key', featuredBadgeKeys);

  if (!badges || badges.length === 0) return [];

  const userIds = [...new Set(badges.map(b => b.user_id))];
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('uid, fullName')
    .in('uid', userIds);

  if (!users) return [];

  return users.map(u => {
    const userBadges = badges.filter(b => b.user_id === u.uid);
    // Get highest badge
    const highestBadge = settings.badges
      .filter(sb => userBadges.some(ub => ub.badge_key === sb.badge_key))
      .sort((a, b) => b.order_threshold - a.order_threshold)[0];

    return {
      userId: u.uid,
      fullName: u.fullName,
      badgeKey: highestBadge?.badge_key || '',
      badgeLabel: highestBadge?.label || '',
      badgeEmoji: highestBadge?.emoji || '',
    };
  });
}

// ─── Admin: Customer Loyalty Detail ─────────────────────────────────────
export async function getCustomerLoyaltyDetail(userId: string) {
  const [
    streakRes,
    badgesRes,
    coinTxRes,
    referralTxRes,
    balance,
  ] = await Promise.all([
    supabaseAdmin.from('customer_streaks').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('customer_badges').select('*').eq('user_id', userId).order('earned_at'),
    supabaseAdmin.from('coin_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('referral_transactions').select('*').or(`referrer_user_id.eq.${userId},referred_user_id.eq.${userId}`).order('created_at', { ascending: false }),
    getCoinBalance(userId),
  ]);

  return {
    streak: streakRes.data || { current_streak: 0, longest_streak: 0, last_order_date: null },
    badges: badgesRes.data || [],
    coinTransactions: coinTxRes.data || [],
    referralTransactions: referralTxRes.data || [],
    coinBalance: balance,
  };
}

// ─── Admin: Enriched Customer List ──────────────────────────────────────
export async function getEnrichedCustomerList() {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('fullName');

  if (!users) return [];

  const userIds = users.map(u => u.uid);

  // Parallel batch queries
  const [orderCounts, badges, streaks, referralCounts] = await Promise.all([
    // Order counts per user
    supabaseAdmin
      .from('orders')
      .select('userId')
      .neq('status', 'Cancelled')
      .in('userId', userIds),
    // Latest badge per user
    supabaseAdmin
      .from('customer_badges')
      .select('user_id, badge_key')
      .in('user_id', userIds),
    // Streaks
    supabaseAdmin
      .from('customer_streaks')
      .select('user_id, current_streak')
      .in('user_id', userIds),
    // Referral counts
    supabaseAdmin
      .from('referral_transactions')
      .select('referrer_user_id')
      .in('referrer_user_id', userIds),
  ]);

  // Build lookup maps
  const orderCountMap: Record<string, number> = {};
  (orderCounts.data || []).forEach((o: any) => {
    orderCountMap[o.userId] = (orderCountMap[o.userId] || 0) + 1;
  });

  const settings = await getLoyaltySettings();
  const badgeMap: Record<string, { key: string; emoji: string; label: string }> = {};
  (badges.data || []).forEach((b: any) => {
    const config = settings.badges.find(sb => sb.badge_key === b.badge_key);
    const existing = badgeMap[b.user_id];
    const existingThreshold = existing ? (settings.badges.find(sb => sb.badge_key === existing.key)?.order_threshold || 0) : 0;
    const newThreshold = config?.order_threshold || 0;
    if (!existing || newThreshold > existingThreshold) {
      badgeMap[b.user_id] = { key: b.badge_key, emoji: config?.emoji || '', label: config?.label || '' };
    }
  });

  const streakMap: Record<string, number> = {};
  (streaks.data || []).forEach((s: any) => {
    streakMap[s.user_id] = s.current_streak;
  });

  const referralCountMap: Record<string, number> = {};
  (referralCounts.data || []).forEach((r: any) => {
    referralCountMap[r.referrer_user_id] = (referralCountMap[r.referrer_user_id] || 0) + 1;
  });

  // Get coin balances — batch approach (since we can't use RPC in batch, compute from transactions)
  const { data: allCoinTx } = await supabaseAdmin
    .from('coin_transactions')
    .select('user_id, amount')
    .in('user_id', userIds);

  const coinBalanceMap: Record<string, number> = {};
  (allCoinTx || []).forEach((t: any) => {
    coinBalanceMap[t.user_id] = (coinBalanceMap[t.user_id] || 0) + Number(t.amount);
  });

  return users.map(u => ({
    ...u,
    totalOrders: orderCountMap[u.uid] || 0,
    badge: badgeMap[u.uid] || null,
    coinBalance: coinBalanceMap[u.uid] || 0,
    currentStreak: streakMap[u.uid] || 0,
    referralsMade: referralCountMap[u.uid] || 0,
  }));
}

// ─── Sitara Monthly Discount ────────────────────────────────────────────
export async function checkSitaraMonthlyDiscount(userId: string): Promise<number> {
  const settings = await getLoyaltySettings();
  const sitaraBadge = settings.badges.find(b => b.badge_key === 'sitara');
  if (!sitaraBadge || !sitaraBadge.discount_amount) return 0;

  // Check if user has Sitara badge
  const { data: badge } = await supabaseAdmin
    .from('customer_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_key', 'sitara')
    .maybeSingle();

  if (!badge) return 0;

  // Check if discount was already used this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: usedThisMonth } = await supabaseAdmin
    .from('coin_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'redemption')
    .eq('note', 'Sitara monthly discount')
    .gte('created_at', startOfMonth.toISOString())
    .maybeSingle();

  if (usedThisMonth) return 0;

  return sitaraBadge.discount_amount;
}

export async function applySitaraDiscount(userId: string, orderId: string, amount: number): Promise<boolean> {
  // Record as a special coin transaction (negative amount but type indicates source)
  const { error } = await supabaseAdmin
    .from('coin_transactions')
    .insert({
      user_id: userId,
      amount: 0, // Not deducting from coin balance — this is a free discount
      type: 'redemption',
      order_id: orderId,
      note: 'Sitara monthly discount',
    });

  return !error;
}

// ─── Voucher Logic ──────────────────────────────────────────────────────
export async function validateVoucher(
  userId: string,
  code: string,
  orderTotal: number
): Promise<{ voucher: any; discount: number } | null> {
  const { data: voucher } = await supabaseAdmin
    .from('vouchers')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (!voucher) return null;

  // Check expiry
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) return null;

  // Check min order
  if (orderTotal < voucher.min_order_value) return null;

  // Check usage
  const { data: usage } = await supabaseAdmin
    .from('voucher_usage')
    .select('id')
    .eq('voucher_id', voucher.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (usage) return null; // already used

  let discount = 0;
  if (voucher.discount_type === 'flat') {
    discount = Number(voucher.discount_value);
  } else if (voucher.discount_type === 'percent') {
    discount = (orderTotal * Number(voucher.discount_value)) / 100;
    if (voucher.max_discount_amount) {
      discount = Math.min(discount, Number(voucher.max_discount_amount));
    }
  }

  return { voucher, discount };
}

export async function processVoucherUsage(
  userId: string,
  voucherId: string,
  orderId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('voucher_usage')
    .insert({
      user_id: userId,
      voucher_id: voucherId,
      order_id: orderId,
    });

  if (!error) {
    // Increment global usage count
    await supabaseAdmin.rpc('increment_voucher_usage', { v_id: voucherId });
  }

  return !error;
}

export async function adjustCoins(userId: string, amount: number, note: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('coin_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      type: amount >= 0 ? 'earned' : 'redemption',
      note: note,
    });
  return !error;
}






