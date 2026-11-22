import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Financial summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { period = 'month', start_date, end_date } = req.query;

  // Total sales revenue
  const salesRev = await db.prepare(`
    SELECT COALESCE(SUM(final_amount), 0) as total
    FROM sales
    WHERE status = 'completed' AND company_id = ?
  `).get(companyId) as { total: number };

  // Total OS revenue
  const osRev = await db.prepare(`
    SELECT COALESCE(SUM(total_amount - discount), 0) as total
    FROM service_orders
    WHERE status IN ('Finalizada', 'Pronta') AND company_id = ?
  `).get(companyId) as { total: number };

  // Total expenses paid
  const expensesPaid = await db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE status = 'paid' AND company_id = ?
  `).get(companyId) as { total: number };

  // Total expenses pending
  const expensesPending = await db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE status = 'pending' AND company_id = ?
  `).get(companyId) as { total: number };

  const totalRevenue = salesRev.total + osRev.total;
  const netProfit = totalRevenue - expensesPaid.total;

  return res.json({
    total_revenue: totalRevenue,
    sales_revenue: salesRev.total,
    os_revenue: osRev.total,
    expenses_paid: expensesPaid.total,
    expenses_pending: expensesPending.total,
    net_profit: netProfit
  });
});

// Expenses
router.get('/expenses', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { status, category } = req.query;

  let whereClauses: string[] = ['company_id = ?'];
  let params: any[] = [companyId];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  if (category) {
    whereClauses.push('category = ?');
    params.push(category);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const expenses = await db.prepare(`SELECT * FROM expenses ${whereSql} ORDER BY due_date ASC`).all(...params);

  return res.json(expenses);
});

router.post('/expenses', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { description, category, due_date, amount, payment_method, status = 'pending', notes } = req.body;

  if (!description || !amount || !due_date) {
    return res.status(400).json({ error: 'Descrição, valor e vencimento são obrigatórios.' });
  }

  const numAmount = Number(amount);

  const ins = await db.prepare(`
    INSERT INTO expenses (company_id, description, category, due_date, amount, payment_method, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, description, category || 'Geral', due_date, numAmount, payment_method || null, status, notes || null);

  await logAudit(req.user!.id, req.user!.name, 'Financeiro', 'Cadastro de Despesa', `Cadastrou a despesa "${description}" no valor de R$ ${numAmount.toFixed(2)}`, Number(ins.lastInsertRowid), undefined, companyId);

  return res.status(201).json({ id: ins.lastInsertRowid });
});

router.patch('/expenses/:id/pay', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { payment_method = 'Dinheiro' } = req.body;

  const result = await db.prepare(`
    UPDATE expenses
    SET status = 'paid', payment_date = CURRENT_TIMESTAMP, payment_method = ?
    WHERE id = ? AND company_id = ?
  `).run(payment_method, req.params.id, companyId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Despesa não encontrada ou não pertence a esta empresa.' });
  }

  return res.json({ success: true });
});

// Card rates
router.get('/rates', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const rates = await db.prepare('SELECT * FROM card_rates WHERE company_id = ? ORDER BY card_type ASC, installments ASC').all(companyId);
  return res.json(rates);
});

router.post('/rates', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { rates } = req.body; // array of { card_type, installments, rate_percent }

  if (!Array.isArray(rates)) {
    return res.status(400).json({ error: 'Formato inválido' });
  }

  const saveRatesTx = db.transaction(async () => {
    await db.prepare('DELETE FROM card_rates WHERE company_id = ?').run(companyId);
    const insert = await db.prepare('INSERT INTO card_rates (company_id, card_type, installments, rate_percent) VALUES (?, ?, ?, ?)');
    rates.forEach(r => insert.run(companyId, r.card_type, Number(r.installments), Number(r.rate_percent)));
  });

  await saveRatesTx();
  return res.json({ success: true });
});

// Technician commissions
router.get('/commissions', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const technicians = await db.prepare(`
    SELECT u.id, u.name, u.commission_rate,
           COALESCE(SUM(soi.total_price), 0) as services_total,
           COALESCE(SUM(soi.total_price * (u.commission_rate / 100)), 0) as commission_amount
    FROM users u
    LEFT JOIN service_order_items soi ON soi.technician_id = u.id AND soi.item_type = 'service'
    LEFT JOIN service_orders so ON so.id = soi.os_id AND so.status IN ('Finalizada', 'Pronta') AND so.company_id = u.company_id
    WHERE u.role IN ('technician', 'master') AND u.company_id = ?
    GROUP BY u.id
  `).all();

  return res.json(technicians);
});

export default router;
