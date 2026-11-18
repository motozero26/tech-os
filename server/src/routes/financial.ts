import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Financial summary
router.get('/summary', (req: AuthRequest, res: Response) => {
  const { period = 'month', start_date, end_date } = req.query;

  // Total sales revenue
  const salesRev = db.prepare(`
    SELECT COALESCE(SUM(final_amount), 0) as total
    FROM sales
    WHERE status = 'completed'
  `).get() as { total: number };

  // Total OS revenue
  const osRev = db.prepare(`
    SELECT COALESCE(SUM(total_amount - discount), 0) as total
    FROM service_orders
    WHERE status IN ('Finalizada', 'Pronta')
  `).get() as { total: number };

  // Total expenses paid
  const expensesPaid = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE status = 'paid'
  `).get() as { total: number };

  // Total expenses pending
  const expensesPending = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE status = 'pending'
  `).get() as { total: number };

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
router.get('/expenses', (req: AuthRequest, res: Response) => {
  const { status, category } = req.query;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  if (category) {
    whereClauses.push('category = ?');
    params.push(category);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const expenses = db.prepare(`SELECT * FROM expenses ${whereSql} ORDER BY due_date ASC`).all(...params);

  return res.json(expenses);
});

router.post('/expenses', (req: AuthRequest, res: Response) => {
  const { description, category, due_date, amount, payment_method, status = 'pending', notes } = req.body;

  if (!description || !amount || !due_date) {
    return res.status(400).json({ error: 'Descrição, valor e vencimento são obrigatórios.' });
  }

  const numAmount = Number(amount);

  const ins = db.prepare(`
    INSERT INTO expenses (description, category, due_date, amount, payment_method, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(description, category || 'Geral', due_date, numAmount, payment_method || null, status, notes || null);

  logAudit(req.user!.id, req.user!.name, 'Financeiro', 'Cadastro de Despesa', `Cadastrou a despesa "${description}" no valor de R$ ${numAmount.toFixed(2)}`, Number(ins.lastInsertRowid));

  return res.status(201).json({ id: ins.lastInsertRowid });
});

router.patch('/expenses/:id/pay', (req: AuthRequest, res: Response) => {
  const { payment_method = 'Dinheiro' } = req.body;

  db.prepare(`
    UPDATE expenses
    SET status = 'paid', payment_date = CURRENT_TIMESTAMP, payment_method = ?
    WHERE id = ?
  `).run(payment_method, req.params.id);

  return res.json({ success: true });
});

// Card rates
router.get('/rates', (req: AuthRequest, res: Response) => {
  const rates = db.prepare('SELECT * FROM card_rates ORDER BY card_type ASC, installments ASC').all();
  return res.json(rates);
});

router.post('/rates', (req: AuthRequest, res: Response) => {
  const { rates } = req.body; // array of { card_type, installments, rate_percent }

  if (!Array.isArray(rates)) {
    return res.status(400).json({ error: 'Formato inválido' });
  }

  const saveRatesTx = db.transaction(() => {
    db.prepare('DELETE FROM card_rates').run();
    const insert = db.prepare('INSERT INTO card_rates (card_type, installments, rate_percent) VALUES (?, ?, ?)');
    rates.forEach(r => insert.run(r.card_type, Number(r.installments), Number(r.rate_percent)));
  });

  saveRatesTx();
  return res.json({ success: true });
});

// Technician commissions
router.get('/commissions', (req: AuthRequest, res: Response) => {
  const technicians = db.prepare(`
    SELECT u.id, u.name, u.commission_rate,
           COALESCE(SUM(soi.total_price), 0) as services_total,
           COALESCE(SUM(soi.total_price * (u.commission_rate / 100)), 0) as commission_amount
    FROM users u
    LEFT JOIN service_order_items soi ON soi.technician_id = u.id AND soi.item_type = 'service'
    LEFT JOIN service_orders so ON so.id = soi.os_id AND so.status IN ('Finalizada', 'Pronta')
    WHERE u.role IN ('technician', 'master')
    GROUP BY u.id
  `).all();

  return res.json(technicians);
});

export default router;
