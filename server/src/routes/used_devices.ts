import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List pre-owned devices
router.get('/', (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const whereSql = status ? 'WHERE udt.status = ?' : '';
  const params = status ? [status] : [];

  const devices = db.prepare(`
    SELECT udt.*, c.name as customer_name, c.phone as customer_phone, c.cpf_cnpj as customer_cpf
    FROM used_device_trades udt
    JOIN customers c ON c.id = udt.customer_id
    ${whereSql}
    ORDER BY udt.id DESC
  `).all(...params);

  return res.json(devices);
});

// Purchase used device from customer
router.post('/purchase', (req: AuthRequest, res: Response) => {
  const {
    customer_id, customer_name, customer_phone, customer_cpf,
    brand, model, imei_serial, color, condition_grade,
    purchase_price, expected_sale_price, notes
  } = req.body;

  if (!brand || !model || !imei_serial || !purchase_price) {
    return res.status(400).json({ error: 'Marca, modelo, IMEI e valor de compra são obrigatórios.' });
  }

  const openSession = db.prepare("SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1").get() as any;
  if (!openSession) {
    return res.status(400).json({ error: 'O caixa precisa estar aberto para registrar a compra de seminovo.' });
  }

  const buyTx = db.transaction(() => {
    // 1. Resolve Customer
    let resolvedCustomerId = customer_id;
    if (!resolvedCustomerId) {
      if (!customer_name) throw new Error('Nome do cliente é obrigatório');
      const newCust = db.prepare(`
        INSERT INTO customers (name, phone, cpf_cnpj)
        VALUES (?, ?, ?)
      `).run(customer_name, customer_phone || null, customer_cpf || null);
      resolvedCustomerId = newCust.lastInsertRowid;
    }

    const numPrice = Number(purchase_price);

    // 2. Insert trade record
    const ins = db.prepare(`
      INSERT INTO used_device_trades (
        type, session_id, user_id, customer_id, brand, model,
        imei_serial, color, condition_grade, price, status, notes
      ) VALUES ('purchase', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stock', ?)
    `).run(
      openSession.id, req.user!.id, resolvedCustomerId, brand, model,
      imei_serial, color || null, condition_grade || 'Bom', numPrice, notes || null
    );

    const tradeId = ins.lastInsertRowid;

    // 3. Register cash transaction (bleed / out)
    db.prepare(`
      INSERT INTO cash_transactions (
        session_id, user_id, type, amount, payment_method,
        reference_type, reference_id, description
      ) VALUES (?, ?, 'used_purchase', ?, 'Dinheiro', 'used_trade', ?, ?)
    `).run(
      openSession.id, req.user!.id, numPrice, tradeId,
      `Compra de seminovo: ${brand} ${model} (IMEI: ${imei_serial})`
    );

    // 4. Optionally insert into products inventory as well
    if (expected_sale_price) {
      db.prepare(`
        INSERT INTO products (
          name, sku, cost_price, sale_price, stock_quantity, min_stock, is_part
        ) VALUES (?, ?, ?, ?, 1, 0, 0)
      `).run(
        `Seminovo: ${brand} ${model} (${color || 'Único'}) - IMEI: ${imei_serial}`,
        `SN-${imei_serial.slice(-6)}`,
        numPrice,
        Number(expected_sale_price)
      );
    }

    logAudit(req.user!.id, req.user!.name, 'Caixa', 'Compra de Seminovo', `Comprou ${brand} ${model} por R$ ${numPrice.toFixed(2)}`, Number(tradeId));

    return tradeId;
  });

  try {
    const tradeId = buyTx();
    return res.status(201).json({ success: true, tradeId });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao registrar compra de seminovo' });
  }
});

export default router;
