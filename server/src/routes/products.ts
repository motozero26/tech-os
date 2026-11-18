import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List products
router.get('/', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { is_part, q, low_stock, active_only = 1 } = req.query;

  let whereClauses: string[] = ['p.company_id = ?'];
  let params: any[] = [companyId];

  if (active_only) {
    whereClauses.push('p.active = 1');
  }

  if (is_part !== undefined) {
    whereClauses.push('p.is_part = ?');
    params.push(Number(is_part));
  }

  if (low_stock) {
    whereClauses.push('p.stock_quantity <= p.min_stock');
  }

  if (q) {
    whereClauses.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const products = db.prepare(`
    SELECT p.*, c.name as category_name, b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    ${whereSql}
    ORDER BY p.name ASC
  `).all(...params);

  return res.json(products);
});

// Create product
router.post('/', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    barcode, sku, name, category_id, brand_id, supplier_id,
    cost_price = 0, sale_price = 0, stock_quantity = 0, min_stock = 2,
    is_part = 0, ncm = '8517.13.00', unit = 'UN'
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
  }

  const resInsert = db.prepare(`
    INSERT INTO products (
      company_id, barcode, sku, name, category_id, brand_id, supplier_id,
      cost_price, sale_price, stock_quantity, min_stock, is_part, ncm, unit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId, barcode || null, sku || null, name, category_id || null, brand_id || null, supplier_id || null,
    Number(cost_price), Number(sale_price), Number(stock_quantity), Number(min_stock), Number(is_part),
    ncm || '8517.13.00', unit || 'UN'
  );

  logAudit(req.user!.id, req.user!.name, 'Estoque', 'Cadastro de Produto', `Cadastrou o item "${name}"`, Number(resInsert.lastInsertRowid), undefined, companyId);

  return res.status(201).json({ id: resInsert.lastInsertRowid });
});

// Update product
router.put('/:id', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    barcode, sku, name, category_id, brand_id, supplier_id,
    cost_price, sale_price, stock_quantity, min_stock, is_part, active,
    ncm, unit
  } = req.body;

  const result = db.prepare(`
    UPDATE products
    SET barcode = ?, sku = ?, name = ?, category_id = ?, brand_id = ?, supplier_id = ?,
        cost_price = ?, sale_price = ?, stock_quantity = ?, min_stock = ?, is_part = ?, active = ?,
        ncm = COALESCE(?, ncm), unit = COALESCE(?, unit)
    WHERE id = ? AND company_id = ?
  `).run(
    barcode || null, sku || null, name, category_id || null, brand_id || null, supplier_id || null,
    Number(cost_price), Number(sale_price), Number(stock_quantity), Number(min_stock), Number(is_part),
    active !== undefined ? Number(active) : 1, ncm || null, unit || null, req.params.id, companyId
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Produto não encontrado ou não pertence a esta empresa.' });
  }

  logAudit(req.user!.id, req.user!.name, 'Estoque', 'Edição de Produto', `Atualizou o item "${name}" (ID ${req.params.id})`, Number(req.params.id), undefined, companyId);

  return res.json({ success: true });
});

// Categories
router.get('/categories', (req: AuthRequest, res: Response) => {
  const { type } = req.query;
  const whereSql = type ? 'WHERE type = ?' : '';
  const params = type ? [type] : [];
  const categories = db.prepare(`SELECT * FROM categories ${whereSql} ORDER BY name ASC`).all(...params);
  return res.json(categories);
});

router.post('/categories', (req: AuthRequest, res: Response) => {
  const { name, type = 'product' } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const ins = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)').run(name, type);
  return res.status(201).json({ id: ins.lastInsertRowid, name, type });
});

// Brands
router.get('/brands', (req: AuthRequest, res: Response) => {
  const brands = db.prepare('SELECT * FROM brands ORDER BY name ASC').all();
  return res.json(brands);
});

router.post('/brands', (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const ins = db.prepare('INSERT INTO brands (name) VALUES (?)').run(name);
  return res.status(201).json({ id: ins.lastInsertRowid, name });
});

// Services Catalog
router.get('/services', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const services = db.prepare(`
    SELECT sc.*, c.name as category_name
    FROM services_catalog sc
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE sc.active = 1 AND sc.company_id = ?
    ORDER BY sc.name ASC
  `).all(companyId);
  return res.json(services);
});

router.post('/services', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { name, category_id, default_price = 0, estimated_time_minutes = 60, default_commission_percent = 10 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const ins = db.prepare(`
    INSERT INTO services_catalog (company_id, name, category_id, default_price, estimated_time_minutes, default_commission_percent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(companyId, name, category_id || null, Number(default_price), Number(estimated_time_minutes), Number(default_commission_percent));

  logAudit(req.user!.id, req.user!.name, 'Cadastros', 'Novo Serviço', `Cadastrou o serviço "${name}" no catálogo`, Number(ins.lastInsertRowid), undefined, companyId);

  return res.status(201).json({ id: ins.lastInsertRowid });
});

export default router;
