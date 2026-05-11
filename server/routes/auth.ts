import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Get current user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', req.user?.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Register user profile after Supabase Auth signup
router.post('/register-profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phoneNumber, place } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        uid: req.user?.id,
        fullName,
        phoneNumber,
        place,
        role: 'user', // Default role
        trustLabel: 'normal',
        creditLimit: 0,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
