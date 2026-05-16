import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// Public: Get store config
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('config')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update store config
router.put('/', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { isOpen, minOrderValue, reopenMessage, storeInfo } = req.body;
    
    const updateConfig: any = {};
    if (isOpen !== undefined) updateConfig.isOpen = isOpen;
    if (minOrderValue !== undefined) updateConfig.minOrderValue = minOrderValue;
    if (reopenMessage !== undefined) updateConfig.reopenMessage = reopenMessage;
    if (storeInfo !== undefined) updateConfig.storeInfo = storeInfo;

    const { data, error } = await supabaseAdmin
      .from('config')
      .update(updateConfig)
      .eq('id', 'main')
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
