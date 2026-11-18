import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Create new sale (PDV)
router.post('/', (req: AuthRequest, res: Response) => {
  const {
    customer_id, items, discount = 0, payment_method = 'Dinheiro',
    installments = 1, notes
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'A venda deve conter ao menos um item.' });
  }

  const openSession = db.prepare("SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1").get() as any;
  if (!openSession) {
    return res.status(400).json({ error: 'O caixa está fechado! Abra o caixa para realizar vendas.' });
  }

  const runSaleTx = db.transaction(() => {
    // Next sale code
    const lastCode = db.prepare('SELECT MAX(code) as max_code FROM sales').get() as { max_code: number | null };
    const code = (lastCode?.max_code || 0) + 1;

    let totalProducts = 0;
    const processedItems: any[] = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unit_price) || 0;
      const totalItem = qty * unitPrice;
      totalProducts += totalItem;

      let costPrice = 0;
      if (item.product_id) {
        const prod = db.prepare('SELECT id, name, cost_price, stock_quantity FROM products WHERE id = ?').get(item.product_id) as any;
        if (prod) {
          costPrice = prod.cost_price || 0;
          // Deduct stock
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(qty, item.product_id);
        }
      }

      processedItems.push({
        product_id: item.product_id || null,
        description: item.description,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalItem,
        cost_price: costPrice
      });
    }

    const numDiscount = Number(discount) || 0;
    const finalAmount = Math.max(0, totalProducts - numDiscount);

    // Insert sale
    const saleInsert = db.prepare(`
      INSERT INTO sales (
        code, session_id, user_id, customer_id, total_products,
        discount, final_amount, payment_method, installments, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code, openSession.id, req.user!.id, customer_id || null, totalProducts,
      numDiscount, finalAmount, payment_method, installments, notes || null
    );

    const saleId = saleInsert.lastInsertRowid;

    // Insert sale items
    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, description, quantity, unit_price, total_price, cost_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    processedItems.forEach(it => {
      insertItem.run(saleId, it.product_id, it.description, it.quantity, it.unit_price, it.total_price, it.cost_price);
    });

    // Register transaction in cash register
    db.prepare(`
      INSERT INTO cash_transactions (
        session_id, user_id, type, amount, payment_method,
        reference_type, reference_id, description
      ) VALUES (?, ?, 'sale', ?, ?, 'sale', ?, ?)
    `).run(
      openSession.id, req.user!.id, finalAmount, payment_method,
      saleId, `Venda PDV #${code}`
    );

    logAudit(req.user!.id, req.user!.name, 'Caixa', 'Venda', `Realizou a venda #${code} no valor de R$ ${finalAmount.toFixed(2)} (${payment_method})`, Number(saleId));

    return { saleId, code, finalAmount };
  });

  try {
    const result = runSaleTx();
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao processar venda' });
  }
});

// List sales
router.get('/', (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 50, q } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (q) {
    whereClauses.push('(s.code LIKE ? OR c.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sales = db.prepare(`
    SELECT s.*, c.name as customer_name, u.name as user_name,
           (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    JOIN users u ON u.id = s.user_id
    ${whereSql}
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  return res.json(sales);
});

// Get sale details (for receipts)
router.get('/:id', (req: AuthRequest, res: Response) => {
  const sale = db.prepare(`
    SELECT s.*, c.name as customer_name, c.cpf_cnpj as customer_cpf, c.phone as customer_phone,
           u.name as user_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(req.params.id) as any;

  if (!sale) {
    return res.status(404).json({ error: 'Venda não encontrada' });
  }

  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
  const company = db.prepare('SELECT * FROM companies LIMIT 1').get();

  return res.json({ sale, items, company });
});

export default router;
