import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Status of active cash register
router.get('/status', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const openSession = await db.prepare(`
    SELECT * FROM cash_sessions WHERE status = 'open' AND company_id = ? ORDER BY id DESC LIMIT 1
  `).get(companyId) as any;

  if (!openSession) {
    return res.json({ isOpen: false, session: null });
  }

  // Transactions in current session
  const transactions = await db.prepare(`
    SELECT * FROM cash_transactions WHERE session_id = ? ORDER BY id DESC
  `).all(openSession.id) as any[];

  // Totals by payment method
  const summaryByMethod = await db.prepare(`
    SELECT payment_method,
           COALESCE(SUM(CASE WHEN type IN ('sale', 'os_payment', 'os_advance', 'supply') THEN amount ELSE -amount END), 0) as total
    FROM cash_transactions
    WHERE session_id = ?
    GROUP BY payment_method
  `).all(openSession.id);

  // Total balance
  let totalBalance = openSession.opening_balance;
  transactions.forEach(t => {
    if (['supply', 'sale', 'os_payment', 'os_advance'].includes(t.type)) {
      totalBalance += t.amount;
    } else {
      totalBalance -= t.amount;
    }
  });

  return res.json({
    isOpen: true,
    session: openSession,
    totalBalance,
    transactions,
    summaryByMethod
  });
});

// Open cash register
router.post('/open', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { opening_balance = 0, notes } = req.body;

  const existing = await db.prepare("SELECT id FROM cash_sessions WHERE status = 'open' AND company_id = ?").get(companyId);
  if (existing) {
    return res.status(400).json({ error: 'Já existe um caixa aberto no momento para esta empresa.' });
  }

  const numOpening = Number(opening_balance) || 0;

  const openTx = db.transaction(async () => {
    const res = await db.prepare(`
      INSERT INTO cash_sessions (company_id, user_id, user_name, opening_balance, status, notes)
      VALUES (?, ?, ?, ?, 'open', ?)
    `).run(companyId, req.user!.id, req.user!.name, numOpening, notes || null);

    const sessionId = res.lastInsertRowid;

    if (numOpening > 0) {
      await db.prepare(`
        INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, description)
        VALUES (?, ?, 'supply', ?, 'Dinheiro', 'Suprimento inicial (Fundo de troco)')
      `).run(sessionId, req.user!.id, numOpening);
    }

    await logAudit(req.user!.id, req.user!.name, 'Caixa', 'Abertura', `Abriu o caixa com suprimento de R$ ${numOpening.toFixed(2)}`, Number(sessionId), undefined, companyId);
    return sessionId;
  });

  const sessionId = await openTx();
  return res.status(201).json({ success: true, sessionId });
});

// Close cash register
router.post('/close', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { closing_balance, notes } = req.body;

  const openSession = await db.prepare("SELECT * FROM cash_sessions WHERE status = 'open' AND company_id = ? ORDER BY id DESC LIMIT 1").get(companyId) as any;
  if (!openSession) {
    return res.status(400).json({ error: 'Não há caixa aberto para fechar nesta empresa.' });
  }

  const numClosing = Number(closing_balance) || 0;

  await db.prepare(`
    UPDATE cash_sessions
    SET closing_balance = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP, notes = ?
    WHERE id = ? AND company_id = ?
  `).run(numClosing, notes || null, openSession.id, companyId);

  await logAudit(req.user!.id, req.user!.name, 'Caixa', 'Fechamento', `Fechou o caixa com saldo apurado de R$ ${numClosing.toFixed(2)}`, openSession.id, undefined, companyId);

  return res.json({ success: true });
});

// Manual transaction (Sangria / Suprimento)
router.post('/transaction', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { type, amount, payment_method = 'Dinheiro', description } = req.body;

  if (!type || !amount || !description) {
    return res.status(400).json({ error: 'Tipo, valor e descrição são obrigatórios.' });
  }

  const openSession = await db.prepare("SELECT * FROM cash_sessions WHERE status = 'open' AND company_id = ? ORDER BY id DESC LIMIT 1").get(companyId) as any;
  if (!openSession) {
    return res.status(400).json({ error: 'O caixa precisa estar aberto para registrar movimentações.' });
  }

  const numAmount = Number(amount);
  if (numAmount <= 0) {
    return res.status(400).json({ error: 'O valor deve ser maior que zero.' });
  }

  await db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(openSession.id, req.user!.id, type, numAmount, payment_method, description);

  await logAudit(req.user!.id, req.user!.name, 'Caixa', type === 'bleed' ? 'Sangria' : 'Suprimento', `${type === 'bleed' ? 'Sangria' : 'Suprimento'} de R$ ${numAmount.toFixed(2)}: ${description}`, openSession.id, undefined, companyId);

  return res.status(201).json({ success: true });
});

// Cash history
router.get('/history', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const sessions = await db.prepare(`
    SELECT cs.*,
           (SELECT COUNT(*) FROM cash_transactions ct WHERE ct.session_id = cs.id) as transactions_count,
           (SELECT COALESCE(SUM(ct.amount), 0) FROM cash_transactions ct WHERE ct.session_id = cs.id AND ct.type IN ('sale', 'os_payment', 'os_advance', 'supply')) as total_in,
           (SELECT COALESCE(SUM(ct.amount), 0) FROM cash_transactions ct WHERE ct.session_id = cs.id AND ct.type IN ('bleed', 'expense', 'used_purchase')) as total_out
    FROM cash_sessions cs
    WHERE cs.company_id = ?
    ORDER BY cs.id DESC
    LIMIT 30
  `).all(companyId);

  return res.json(sessions);
});

export default router;
