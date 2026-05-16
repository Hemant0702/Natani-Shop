import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { broadcastToAdmins, sendPushNotification } from './push';
import {
  updateStreakForUser,
  checkAndAwardBadges,
  checkAndAwardCoins,
  applyStreakCoupon,
  redeemCoins,
  processReferral,
  getValidStreakCoupon,
  checkSitaraMonthlyDiscount,
  applySitaraDiscount,
  validateCoinRedemption,
  validateReferral,
  validateVoucher,
  processVoucherUsage,
  awardPendingReferralRewards,
  awardRewardPointsForOrder,
} from '../lib/loyalty';

const router = Router();

// Process idempotently credit coins (wrapper around RPC)
async function creditCoinsForOrder(orderId: string, userId: string, total: number) {
  // Same logic for tiers but mapped to single amount then RPC call
  const { data: paidOrders } = await supabaseAdmin
    .from('orders')
    .select('total')
    .eq('userId', userId)
    .eq('paymentStatus', 'collected')
    .neq('status', 'Cancelled');

  const cumulativeSpend = (paidOrders || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  
  // Hardcoded milestones matching loyalty.ts
  const milestones = [
    { threshold: 500, coins: 2 }, 
    { threshold: 1000, coins: 5 }, 
    { threshold: 2000, coins: 8 }
  ];

  const sortedMilestones = [...milestones].sort((a, b) => a.threshold - b.threshold);

  const { data: awardedMilestones } = await supabaseAdmin
    .from('coin_spend_milestones_log')
    .select('milestone_rupee_threshold')
    .eq('user_id', userId);

  const awardedSet = new Set((awardedMilestones || []).map((m: any) => m.milestone_rupee_threshold));

  let coinsToAward = 0;
  for (const milestone of sortedMilestones) {
    const timesReached = Math.floor(cumulativeSpend / milestone.threshold);
    for (let i = 1; i <= timesReached; i++) {
      const milestoneValue = milestone.threshold * i;
      if (awardedSet.has(milestoneValue)) continue;

      const { error: logError } = await supabaseAdmin
        .from('coin_spend_milestones_log')
        .insert({
          user_id: userId,
          milestone_rupee_threshold: milestoneValue,
          coins_awarded: milestone.coins,
          order_id: orderId,
        });

      if (!logError) {
        coinsToAward += milestone.coins;
        awardedSet.add(milestoneValue);
      }
    }
  }

  if (coinsToAward > 0) {
    await supabaseAdmin.rpc('credit_coins_for_order', {
      p_order_id: orderId,
      p_user_id: userId,
      p_coins: coinsToAward,
      p_note: `Milestone cumulative spend rewarded`
    });
  }
}

// Place new order
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { items, pickupSlot, customerName, customerPhone, streakCouponId, coinRedemptionAmount, referralCode, voucherCode } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Fetch current prices from DB — never trust client total
    const ids = items.map((i: any) => i.productId);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price, variants')
      .in('id', ids);

    if (productsError) throw productsError;

    const priceMap = Object.fromEntries(products.map(p => [p.id, p]));

    let subtotal = 0;
    for (const item of items) {
      const product = priceMap[item.productId];
      if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
      
      let itemPrice = product.price;
      if (item.variantId && product.variants) {
        const variant = (product.variants as any[]).find(v => v.id === item.variantId);
        if (variant && variant.price) itemPrice = variant.price;
      }
      
      subtotal += itemPrice * item.quantity;
    }

    // --- Apply discounts (server-side validation) ---
    let discountBreakdown: any = {};
    let totalDiscount = 0;

    // 1. Streak coupon
    if (streakCouponId) {
      const coupon = await getValidStreakCoupon(req.user!.id);
      if (coupon && coupon.id === streakCouponId && subtotal >= coupon.min_order_value) {
        totalDiscount += Number(coupon.discount_amount);
        discountBreakdown.streakCoupon = Number(coupon.discount_amount);
      }
    }

    // 2. Sitara monthly discount (auto-applied)
    const sitaraDiscount = await checkSitaraMonthlyDiscount(req.user!.id);
    if (sitaraDiscount > 0) {
      totalDiscount += sitaraDiscount;
      discountBreakdown.sitaraDiscount = sitaraDiscount;
    }

    // 3. Coin redemption
    if (coinRedemptionAmount && coinRedemptionAmount > 0) {
      const isCoinValid = await validateCoinRedemption(req.user!.id, coinRedemptionAmount);
      if (isCoinValid) {
        const applicableCoins = Math.min(coinRedemptionAmount, Math.max(0, subtotal - totalDiscount));
        totalDiscount += applicableCoins;
        discountBreakdown.coinRedemption = applicableCoins;
      }
    }

    // 4. Referral code or auto-applied from registration
    const referralValidation = await validateReferral(req.user!.id, referralCode, subtotal);
    if (referralValidation) {
      totalDiscount += referralValidation.discount;
      discountBreakdown.referralCode = referralValidation.discount;
    }

    // 5. Manual Voucher
    let voucherIdToRecord: string | null = null;
    if (voucherCode) {
      const voucherRes = await validateVoucher(req.user!.id, voucherCode, subtotal);
      if (voucherRes) {
        totalDiscount += voucherRes.discount;
        discountBreakdown.voucher = voucherRes.discount;
        voucherIdToRecord = voucherRes.voucher.id;
      }
    }

    const total = Math.max(0, subtotal - totalDiscount);

    const orderData = {
      userId: req.user?.id,
      customerName: customerName || 'Guest',
      customerPhone: customerPhone || '',
      items,
      total,
      pickupSlot,
      status: 'Placed',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;

    const orderId = data.id;

    // --- Post-order loyalty triggers (non-blocking, fire-and-forget) ---
    try {
      // Apply streak coupon if used
      if (streakCouponId && discountBreakdown.streakCoupon) {
        await applyStreakCoupon(streakCouponId, orderId);
      }

      // Apply Sitara discount
      if (discountBreakdown.sitaraDiscount) {
        await applySitaraDiscount(req.user!.id, orderId, discountBreakdown.sitaraDiscount);
      }

      // Coin redemption
      if (discountBreakdown.coinRedemption) {
        await redeemCoins(req.user!.id, discountBreakdown.coinRedemption, orderId);
      }

      // Referral processing
      if (discountBreakdown.referralCode) {
        await processReferral(req.user!.id, referralCode, orderId, subtotal);
      }

      // Voucher usage
      if (voucherIdToRecord) {
        await processVoucherUsage(req.user!.id, voucherIdToRecord, orderId);
      }

      // Streak and badge updates
      await updateStreakForUser(req.user!.id, orderId);
      await checkAndAwardBadges(req.user!.id, orderId);
    } catch (loyaltyErr) {
      console.error('Loyalty trigger error (non-fatal):', loyaltyErr);
    }

    // Notify admins
    broadcastToAdmins({
      title: 'New Order Received! 🛍️',
      body: `A customer placed an order for ₹${total}.`,
      url: '/admin/orders'
    });

    res.json({ ...data, discountBreakdown });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's orders
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('userId', req.user?.id)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all orders
router.get('/all', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update order status
router.put('/:id/status', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (error) throw error;

    // Determine notification title/message based on status
    let title = 'Order Status Updated';
    let message = `Your order is now: ${status}`;
    const relevantStatuses = ['Confirmed', 'Dispatched', 'Delivered', 'Cancelled'];
    
    if (relevantStatuses.includes(status)) {
      if (status === 'Confirmed') {
        title = 'Order Confirmed ✅';
        message = `Your order #${data.id.slice(0, 4)} has been confirmed by the shop`;
      } else if (status === 'Dispatched') {
        title = 'Order On Its Way 🚚';
        message = `Your order #${data.id.slice(0, 4)} is out for delivery`;
      } else if (status === 'Delivered') {
        title = 'Order Delivered 🎉';
        message = `Order #${data.id.slice(0, 4)} has been delivered. Enjoy!`;
      } else if (status === 'Cancelled') {
        title = 'Order Cancelled ❌';
        message = `Order #${data.id.slice(0, 4)} was cancelled. Contact shop for details`;
      }

      // SYSTEM A: Insert to notifications table (realtime)
      await supabaseAdmin.from('notifications').insert({
        user_id: data.userId,
        order_id: data.id,
        title,
        message,
        type: status.toLowerCase(),
        metadata: { status }
      });
    }

    // SYSTEM B: Push notification (background)
    sendPushNotification(data.userId, {
      title,
      body: message,
      url: '/orders'
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update owner note
router.put('/:id/owner-note', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { ownerNote } = req.body;
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ ownerNote })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (ownerNote) {
      sendPushNotification(data.userId, {
        title: 'Note from Shop Owner',
        body: `Regarding your order: ${ownerNote}`,
        url: '/orders'
      });
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Customer: Response to order note
router.put('/:id/response', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { customerResponse } = req.body;
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ customerResponse })
      .eq('id', req.params.id)
      .eq('userId', req.user?.id) // Ensure it's their order
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Mark order picked
router.put('/:id/pick', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentStatus } = req.body;
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'Picked',
        paymentStatus,
        pickedAt: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // If payment is pending, add to khata
    if (paymentStatus === 'pending') {
      await supabaseAdmin.from('khata_entries').insert([{
        userId: data.userId,
        orderId: data.id,
        amount: data.total,
        date: new Date().toISOString(),
        status: 'pending'
      }]);
    }

    // Award coins if payment collected (Atomic RPC approach)
    if (paymentStatus === 'collected') {
      try {
        await creditCoinsForOrder(data.id, data.userId, data.total);
        await awardPendingReferralRewards(data.id);
        await awardRewardPointsForOrder(data.id, data.userId, data.total);
      } catch (loyaltyErr) {
        console.error('Coin award error (non-fatal):', loyaltyErr);
      }
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update payment status
router.put('/:id/payment-status', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentStatus } = req.body;
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ paymentStatus })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Award coins if payment status changed to collected
    if (paymentStatus === 'collected') {
      try {
        await creditCoinsForOrder(data.id, data.userId, data.total);
        await awardPendingReferralRewards(data.id);
        await awardRewardPointsForOrder(data.id, data.userId, data.total);
        
        // Also notify payment collected
        const title = 'Payment Received 💰';
        const message = `Payment for order #${data.id.slice(0, 4)} confirmed`;
        
        await supabaseAdmin.from('notifications').insert({
          user_id: data.userId,
          order_id: data.id,
          title,
          message,
          type: 'payment_collected',
          metadata: { paymentStatus }
        });
        
        sendPushNotification(data.userId, {
          title,
          body: message,
          url: '/orders'
        });
      } catch (loyaltyErr) {
        console.error('Coin award error (non-fatal):', loyaltyErr);
      }
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
