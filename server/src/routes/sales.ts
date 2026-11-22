import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Create new sale (PDV)
router.post('/', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    customer_id, items, discount = 0, payment_method = 'Dinheiro',
    installments = 1, notes
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'A venda deve conter ao menos um item.' });
  }

  const openSession = await db.prepare("SELECT * FROM cash_sessions WHERE status = 'open' AND company_id = ? ORDER BY id DESC LIMIT 1").get(companyId) as any;
  if (!openSession) {
    return res.status(400).json({ error: 'O caixa está fechado! Abra o caixa para realizar vendas.' });
  }

  const runSaleTx = db.transaction(async () => {
    // Next sale code scoped by company
    const lastCode = await db.prepare('SELECT MAX(code) as max_code FROM sales WHERE company_id = ?').get(companyId) as { max_code: number | null };
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
        const prod = await db.prepare('SELECT id, name, cost_price, stock_quantity FROM products WHERE id = ? AND company_id = ?').get(item.product_id, companyId) as any;
        if (prod) {
          costPrice = prod.cost_price || 0;
          // Deduct stock
          await db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND company_id = ?').run(qty, item.product_id, companyId);
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
    const saleInsert = await db.prepare(`
      INSERT INTO sales (
        company_id, code, session_id, user_id, customer_id, total_products,
        discount, final_amount, payment_method, installments, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      companyId, code, openSession.id, req.user!.id, customer_id || null, totalProducts,
      numDiscount, finalAmount, payment_method, installments, notes || null
    );

    const saleId = saleInsert.lastInsertRowid;

    // Insert sale items
    const insertItem = await db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, description, quantity, unit_price, total_price, cost_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of processedItems) {
      await insertItem.run(saleId, it.product_id, it.description, it.quantity, it.unit_price, it.total_price, it.cost_price);
    }

    // Register transaction in cash register
    await db.prepare(`
      INSERT INTO cash_transactions (
        session_id, user_id, type, amount, payment_method,
        reference_type, reference_id, description
      ) VALUES (?, ?, 'sale', ?, ?, 'sale', ?, ?)
    `).run(
      openSession.id, req.user!.id, finalAmount, payment_method,
      saleId, `Venda PDV #${code}`
    );

    await logAudit(req.user!.id, req.user!.name, 'Caixa', 'Venda', `Realizou a venda #${code} no valor de R$ ${finalAmount.toFixed(2)} (${payment_method})`, Number(saleId), undefined, companyId);

    return { saleId, code, finalAmount };
  });

  try {
    const result = await runSaleTx();
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao processar venda' });
  }
});

// List sales
router.get('/', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { page = 1, limit = 50, q } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClauses: string[] = ['s.company_id = ?'];
  let params: any[] = [companyId];

  if (q) {
    whereClauses.push('(s.code LIKE ? OR c.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const sales = await db.prepare(`
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
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const sale = await db.prepare(`
    SELECT s.*, c.name as customer_name, c.cpf_cnpj as customer_cpf, c.phone as customer_phone,
           u.name as user_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.company_id = ?
  `).get(req.params.id, companyId) as any;

  if (!sale) {
    return res.status(404).json({ error: 'Venda não encontrada ou não pertence a esta empresa.' });
  }

  const items = await db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(sale.company_id || companyId);

  return res.json({ sale, items, company });
});

export default router;
