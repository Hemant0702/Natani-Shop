import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateUniqueReferralCode } from '../lib/loyalty';

const router = Router();

// Get current user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', req.user?.id)
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Register user profile after Supabase Auth signup
router.post('/register-profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phoneNumber, email, place, lastActive, appliedReferralCode } = req.body;
    
    // Generate unique referral code for new users
    const referralCode = await generateUniqueReferralCode();

    let referredBy: string | null = null;
    if (appliedReferralCode) {
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('uid')
        .eq('referral_code', appliedReferralCode)
        .maybeSingle();
      if (referrer) {
        referredBy = referrer.uid;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        uid: req.user?.id,
        fullName,
        phoneNumber,
        email,
        place,
        role: 'customer',
        trustLabel: 'normal',
        creditLimit: 500,
        balance: 0,
        lastActive: lastActive || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        referral_code: referralCode,
        referred_by: referredBy || undefined,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
