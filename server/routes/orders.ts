import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { broadcastToAdmins, sendPushNotification } from './push';

const router = Router();

// Place new order
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orderData = {
      ...req.body,
      userId: req.user?.id,
      status: 'Placed',
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;

    // Notify admins
    broadcastToAdmins({
      title: 'New Order Received! 🛍️',
      body: `A customer placed an order for ₹${orderData.total}.`,
      url: '/admin/orders'
    });

    res.json(data);
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

    // Notify customer
    sendPushNotification(data.userId, {
      title: 'Order Status Updated',
      body: `Your order is now: ${status}`,
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
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
