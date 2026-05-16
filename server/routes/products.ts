import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// Public: List all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create product
router.post('/', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      name, category, price, unit, description, image, availabilityStatus,
      variants, discountPercent, discountFlat, isFeatured, hindiName,
      englishAliases, searchKeywords, image_url, image_path
    } = req.body;

    const newProduct = {
      name, category, price, unit, description, image, availabilityStatus,
      variants, discountPercent, discountFlat, isFeatured, hindiName,
      englishAliases, searchKeywords, image_url, image_path
    };

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([newProduct])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update product
router.put('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      name, category, price, unit, description, image, availabilityStatus,
      variants, discountPercent, discountFlat, isFeatured, hindiName,
      englishAliases, searchKeywords, image_url, image_path
    } = req.body;

    const updateProduct = {
      name, category, price, unit, description, image, availabilityStatus,
      variants, discountPercent, discountFlat, isFeatured, hindiName,
      englishAliases, searchKeywords, image_url, image_path
    };

    // Remove undefined fields
    Object.keys(updateProduct).forEach(key => updateProduct[key as keyof typeof updateProduct] === undefined && delete updateProduct[key as keyof typeof updateProduct]);

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updateProduct)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete product
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
