import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import {
  getFullLoyaltyStatus,
  getLoyaltySettings,
  updateLoyaltySettings,
  getFeaturedCustomers,
  getCustomerLoyaltyDetail,
  getEnrichedCustomerList,
  adjustCoins,
  validateVoucher,
  invalidateSettingsCache,
  redeemCoins,
  processReferral,
  getCoinBalance,
} from '../lib/loyalty';

const router = Router();

// ─── Customer: Get my loyalty status ────────────────────────────────────
router.get('/my-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const status = await getFullLoyaltyStatus(req.user!.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Public: Get featured customers for home screen ─────────────────────
router.get('/featured-customers', async (_req, res: Response) => {
  try {
    const customers = await getFeaturedCustomers();
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Admin: Get loyalty settings ────────────────────────────────────────
router.get('/settings', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await getLoyaltySettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Admin: Update loyalty settings ─────────────────────────────────────
router.put('/settings', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { streak, badges, referral, coins } = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };
    if (streak) updateData.streak = streak;
    if (badges) updateData.badges = badges;
    if (referral) updateData.referral = referral;
    if (coins) updateData.coins = coins;

    const { data, error } = await supabaseAdmin
      .from('loyalty_settings')
      .update(updateData)
      .eq('id', 'main')
      .select()
      .single();

    if (error) throw error;

    invalidateSettingsCache();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Customer: Redeem coins ─────────────────────────────────────────────
router.post('/redeem-coins', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, orderId } = req.body;
    if (!amount || !orderId) {
      return res.status(400).json({ error: 'Amount and orderId are required' });
    }

    const success = await redeemCoins(req.user!.id, amount, orderId);
    if (!success) {
      return res.status(400).json({ error: 'Cannot redeem coins: insufficient balance or minimum not met' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Customer: Apply referral code ──────────────────────────────────────
router.post('/apply-referral', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { referralCode, orderId, orderTotal } = req.body;
    if (!referralCode || !orderId) {
      return res.status(400).json({ error: 'Referral code and orderId are required' });
    }

    const result = await processReferral(req.user!.id, referralCode, orderId, orderTotal || 0);
    if (!result) {
      return res.status(400).json({ error: 'Invalid referral code, already used, or order does not meet minimum' });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Admin: Customer loyalty detail ─────────────────────────────────────
router.get('/customer/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const detail = await getCustomerLoyaltyDetail(req.params.userId);
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Admin: Manual coin adjustment ──────────────────────────────────────
router.post('/admin/adjust-coins', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, amount, note } = req.body;
    if (!userId || amount === undefined || !note) {
      return res.status(400).json({ error: 'userId, amount, and note are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('coin_transactions')
      .insert({
        user_id: userId,
        amount: Number(amount),
        type: 'admin_adjustment',
        note,
      })
      .select()
      .single();

    if (error) throw error;

    const newBalance = await getCoinBalance(userId);
    res.json({ transaction: data, newBalance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Customer: Validate voucher code ────────────────────────────────────
router.post('/validate-voucher', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });
    
    const result = await validateVoucher(req.user!.id, code, orderTotal || 0);
    if (!result) {
      return res.status(400).json({ error: 'Invalid voucher code, expired, or minimum order not met.' });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Customer: Get available vouchers ───────────────────────────────────
router.get('/vouchers/available', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date().toISOString();
    const { data: vouchers } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });
    
    // Filter out already used vouchers
    const { data: usage } = await supabaseAdmin
      .from('voucher_usage')
      .select('voucher_id')
      .eq('user_id', req.user!.id);
    
    const usedIds = new Set((usage || []).map(u => u.voucher_id));
    const available = (vouchers || []).filter(v => !usedIds.has(v.id));
    
    res.json(available);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
