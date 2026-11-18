import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List customers
router.get('/', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { q, limit = 50 } = req.query;

  let whereClauses: string[] = ['c.company_id = ?'];
  let params: any[] = [companyId];

  if (q) {
    whereClauses.push('(c.name LIKE ? OR c.phone LIKE ? OR c.cpf_cnpj LIKE ? OR c.email LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const customers = db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM customer_devices cd WHERE cd.customer_id = c.id) as devices_count,
           (SELECT COUNT(*) FROM service_orders so WHERE so.customer_id = c.id AND so.company_id = c.company_id) as orders_count
    FROM customers c
    ${whereSql}
    ORDER BY c.name ASC
    LIMIT ?
  `).all(...params, Number(limit));

  return res.json(customers);
});

// Create customer
router.post('/', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    name, phone, whatsapp, cpf_cnpj, email,
    zip_code, address, number, complement, neighborhood, city, state, notes
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
  }

  const ins = db.prepare(`
    INSERT INTO customers (
      company_id, name, phone, whatsapp, cpf_cnpj, email,
      zip_code, address, number, complement, neighborhood, city, state, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId, name, phone || null, whatsapp || null, cpf_cnpj || null, email || null,
    zip_code || null, address || null, number || null, complement || null,
    neighborhood || null, city || null, state || null, notes || null
  );

  logAudit(req.user!.id, req.user!.name, 'Clientes', 'Cadastro', `Cadastrou o cliente "${name}"`, Number(ins.lastInsertRowid), undefined, companyId);

  return res.status(201).json({ id: ins.lastInsertRowid, name });
});

// Get customer details
router.get('/:id', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  const devices = db.prepare('SELECT * FROM customer_devices WHERE customer_id = ? ORDER BY id DESC').all(req.params.id);
  const orders = db.prepare(`
    SELECT so.id, so.code, so.status, so.entry_date, so.total_amount,
           cd.model as device_model
    FROM service_orders so
    LEFT JOIN customer_devices cd ON cd.id = so.device_id
    WHERE so.customer_id = ? AND so.company_id = ?
    ORDER BY so.id DESC
  `).all(req.params.id, companyId);

  return res.json({ customer, devices, orders });
});

// Add device to customer
router.post('/:id/devices', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a esta empresa.' });
  }

  const { device_type = 'Celular', brand, model, imei_serial, color, unlock_password, notes } = req.body;
  if (!brand || !model) {
    return res.status(400).json({ error: 'Marca e modelo do aparelho são obrigatórios.' });
  }

  const ins = db.prepare(`
    INSERT INTO customer_devices (
      customer_id, device_type, brand, model, imei_serial, color, unlock_password, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id, device_type, brand, model, imei_serial || null, color || null, unlock_password || null, notes || null
  );

  return res.status(201).json({ id: ins.lastInsertRowid });
});

export default router;
