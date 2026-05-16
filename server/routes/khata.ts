import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Get khata entries for user
router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Only allow users to see their own khata, or admin to see any
    if (req.user?.role !== 'admin' && req.user?.id !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabaseAdmin
      .from('khata_entries')
      .select('*')
      .eq('userId', req.params.userId)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Add khata entry
router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, type, amount, note, orderId, date } = req.body;
    
    const newEntry = {
      userId,
      type,
      amount,
      note,
      orderId,
      date: date || new Date().toISOString(),
      status: 'pending',
      isDisputed: false
    };

    const { data, error } = await supabaseAdmin
      .from('khata_entries')
      .insert([newEntry])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Customer/Admin: Flag dispute
router.put('/:entryId/flag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { isDisputed, disputeReason } = req.body;
    
    // Check ownership if not admin
    if (req.user?.role !== 'admin') {
      const { data: entry } = await supabaseAdmin
        .from('khata_entries')
        .select('userId')
        .eq('id', req.params.entryId)
        .single();
        
      if (entry?.userId !== req.user?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('khata_entries')
      .update({ isDisputed, disputeReason })
      .eq('id', req.params.entryId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete khata entry by orderId (e.g. when paid)
router.delete('/order/:orderId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('khata_entries')
      .delete()
      .eq('orderId', req.params.orderId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
