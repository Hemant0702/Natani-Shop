import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { getEnrichedCustomerList } from '../lib/loyalty';

const router = Router();

// Admin: List all customers (enriched with loyalty data)
router.get('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const customers = await getEnrichedCustomerList();
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update trust label
router.put('/:uid/trust-label', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { trustLabel } = req.body;
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ trustLabel })
      .eq('uid', req.params.uid)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update credit limit
router.put('/:uid/credit-limit', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { creditLimit } = req.body;
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ creditLimit })
      .eq('uid', req.params.uid)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
