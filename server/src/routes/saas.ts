import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// ----------------------------------------------------
// Public Gateway Webhook (Does not require Bearer token)
// Restores access immediately upon payment confirmation
// ----------------------------------------------------
async function processSubscriptionApproval(paymentRef: string | number, source: string) {
  // Prioritize matching by secure gateway payment ID to prevent sequential ID guessing
  let existing = await db.prepare('SELECT * FROM subscription_payments WHERE gateway_payment_id = ?').get(String(paymentRef)) as any;
  if (!existing) {
    existing = await db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(Number(paymentRef)) as any;
  }

  if (existing && existing.status !== 'paid') {
    const baseDate = new Date();
    let daysToAdd = 30;
    if (existing.billing_cycle === 'quarterly') daysToAdd = 90;
    else if (existing.billing_cycle === 'semiannual') daysToAdd = 180;
    else if (existing.billing_cycle === 'annual') daysToAdd = 365;

    baseDate.setDate(baseDate.getDate() + daysToAdd);

    const tx = db.transaction(async () => {
      await db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
      await db.prepare(`
        UPDATE companies
        SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
        WHERE id = ?
      `).run(existing.plan_id, existing.plan_name, baseDate.toISOString(), existing.company_id);
    });
    await tx();

    await logAudit(null, 'Webhook Gateway', 'Assinatura', `Acesso restaurado automaticamente via webhook [${source}]`, `Loja ID ${existing.company_id} renovada até ${baseDate.toLocaleDateString('pt-BR')}`, Number(existing.id), undefined, existing.company_id);
    return true;
  }
  return false;
}

// General Webhook
router.post('/webhook/payment', async (req: Request, res: Response) => {
  const { event, payment, id, action, payment_id } = req.body;
  const paymentReferenceId = id || payment?.id || payment_id || req.query.payment_id;

  if (paymentReferenceId) {
    await processSubscriptionApproval(paymentReferenceId, 'Geral');
  }

  return res.json({ success: true, received: true });
});

// Mercado Pago Webhook (IPN & Webhooks)
router.post('/webhook/mercadopago', async (req: Request, res: Response) => {
  const paymentReferenceId = req.body?.data?.id || req.body?.id || req.query?.id || req.query?.['data.id'];
  if (paymentReferenceId) {
    await processSubscriptionApproval(paymentReferenceId, 'Mercado Pago');
  }
  return res.json({ success: true, gateway: 'mercadopago' });
});

// InfinitePay Webhook (CloudWalk)
router.post('/webhook/infinitepay', async (req: Request, res: Response) => {
  const paymentReferenceId = req.body?.data?.transaction_id || req.body?.data?.id || req.body?.id || req.body?.order_id || req.query?.transaction_id;
  if (paymentReferenceId) {
    await processSubscriptionApproval(paymentReferenceId, 'InfinitePay');
  }
  return res.json({ success: true, gateway: 'infinitepay' });
});

// All subsequent routes require superadmin/master authentication
router.use(authMiddleware);
router.use(requireSuperAdmin);

// SaaS Dashboard KPIs
router.get('/stats', async (req: AuthRequest, res: Response) => {
  const now = new Date().toISOString();

  const totalTenants = await db.prepare('SELECT count(*) as count FROM companies').get() as { count: number };
  const activeTenants = await db.prepare("SELECT count(*) as count FROM companies WHERE subscription_status = 'active' AND access_expires_at > ?").get(now) as { count: number };
  const trialTenants = await db.prepare("SELECT count(*) as count FROM companies WHERE subscription_status = 'trial' AND access_expires_at > ?").get(now) as { count: number };
  const overdueTenants = await db.prepare("SELECT count(*) as count FROM companies WHERE access_expires_at <= ? OR subscription_status IN ('overdue', 'suspended')").get(now) as { count: number };

  const totalCollected = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM subscription_payments WHERE status = 'paid'").get() as { total: number };

  // Calculate MRR (Monthly Recurring Revenue) from active stores
  const mrrQuery = await db.prepare(`
    SELECT COALESCE(SUM(p.price_monthly), 0) as mrr
    FROM companies c
    JOIN plans p ON p.id = c.plan_id
    WHERE c.subscription_status = 'active'
  `).get() as { mrr: number };

  return res.json({
    total_tenants: totalTenants.count,
    active_tenants: activeTenants.count,
    trial_tenants: trialTenants.count,
    overdue_tenants: overdueTenants.count,
    total_collected: totalCollected.total,
    mrr: mrrQuery.mrr
  });
});

// List all stores (Tenants)
router.get('/tenants', async (req: AuthRequest, res: Response) => {
  const { q, status } = req.query;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (q) {
    whereClauses.push('(c.name LIKE ? OR c.trade_name LIKE ? OR c.cnpj LIKE ? OR c.email LIKE ? OR c.company_code LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (status) {
    whereClauses.push('c.subscription_status = ?');
    params.push(status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const tenants = await db.prepare(`
    SELECT c.*, p.name as plan_title, p.price_monthly,
           (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as users_count,
           (SELECT COUNT(*) FROM service_orders so WHERE so.company_id = c.id) as os_count
    FROM companies c
    LEFT JOIN plans p ON p.id = c.plan_id
    ${whereSql}
    ORDER BY c.id DESC
  `).all(...params);

  return res.json(tenants);
});

// Register new client store (Tenant)
router.post('/tenants', async (req: AuthRequest, res: Response) => {
  const {
    name, company_name, trade_name, cnpj, cnpj_cpf, phone, email,
    admin_name, admin_email, admin_password,
    plan_id = 2, trial_days = 7
  } = req.body;

  const resolvedName = name || company_name || trade_name;

  if (!resolvedName || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Nome da loja e dados do administrador são obrigatórios.' });
  }

  const plan = await db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
  const planName = plan ? plan.name : 'Prata';

  const companyCode = Math.random().toString(36).substring(2, 10);
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + Number(trial_days));

  const createTenantTx = db.transaction(async () => {
    // 1. Insert Company
    const compIns = await db.prepare(`
      INSERT INTO companies (
        company_code, name, trade_name, cnpj, phone, email,
        plan_id, plan_name, subscription_status, trial_ends_at, access_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial', ?, ?)
    `).run(
      companyCode, resolvedName, trade_name || resolvedName, cnpj || cnpj_cpf || null, phone || null, email || admin_email,
      plan_id, planName, trialEnds.toISOString(), trialEnds.toISOString()
    );

    const companyId = compIns.lastInsertRowid;

    // 2. Insert Master Admin User for this store
    const passwordHash = bcrypt.hashSync(admin_password, 10);
    await db.prepare(`
      INSERT INTO users (company_id, name, email, password_hash, role, active)
      VALUES (?, ?, ?, ?, 'master', 1)
    `).run(companyId, admin_name, admin_email, passwordHash);

    await logAudit(req.user!.id, req.user!.name, 'SaaS Admin', 'Nova Loja', `Cadastrou a loja "${resolvedName}" com ${trial_days} dias de teste.`, Number(companyId));

    return { id: companyId, companyId, company_code: companyCode, companyCode };
  });

  try {
    const result = await createTenantTx();
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao cadastrar loja' });
  }
});

// Update store access validity, plan or status
router.put('/tenants/:id', async (req: AuthRequest, res: Response) => {
  const companyId = req.params.id;
  const { plan_id, subscription_status, access_expires_at, add_days, days_to_add } = req.body;

  const current = await db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;
  if (!current) {
    return res.status(404).json({ error: 'Loja não encontrada' });
  }

  let newExpiration = access_expires_at || current.access_expires_at;
  const effectiveDaysToAdd = add_days || days_to_add;

  if (effectiveDaysToAdd) {
    let base = new Date();
    if (current.access_expires_at && new Date(current.access_expires_at) > base) {
      base = new Date(current.access_expires_at);
    }
    base.setDate(base.getDate() + Number(effectiveDaysToAdd));
    newExpiration = base.toISOString();
  }

  let planName = current.plan_name;
  if (plan_id) {
    const p = await db.prepare('SELECT name FROM plans WHERE id = ?').get(plan_id) as any;
    if (p) planName = p.name;
  }

  await db.prepare(`
    UPDATE companies
    SET plan_id = COALESCE(?, plan_id),
        plan_name = ?,
        subscription_status = COALESCE(?, subscription_status),
        access_expires_at = ?
    WHERE id = ?
  `).run(plan_id || null, planName, subscription_status || null, newExpiration, companyId);

  await logAudit(req.user!.id, req.user!.name, 'SaaS Admin', 'Edição de Loja', `Atualizou o status da loja ID ${companyId} (Validade: ${newExpiration})`, Number(companyId));

  return res.json({ success: true, newExpiration, subscription_status: subscription_status || current.subscription_status });
});

// Plans Management (Strictly 2 monthly plans: Prata and Ouro)
router.get('/plans', async (req: AuthRequest, res: Response) => {
  const plans = await db.prepare(`
    SELECT p.*,
           (SELECT COUNT(*) FROM companies c WHERE c.plan_id = p.id) as subscribers_count
    FROM plans p
    WHERE p.active = 1 AND p.name IN ('Prata', 'Ouro')
    ORDER BY p.price_monthly ASC
  `).all() as any[];

  return res.json(plans.map(p => ({
    ...p,
    features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || [])
  })));
});

router.post('/plans', async (req: AuthRequest, res: Response) => {
  const { name, description, price_monthly, price_yearly, max_users = 5, max_devices = 1000, features } = req.body;

  if (!name || !price_monthly) {
    return res.status(400).json({ error: 'Nome e valor mensal do plano são obrigatórios.' });
  }

  const featuresJson = Array.isArray(features) ? JSON.stringify(features) : JSON.stringify([features]);

  const ins = await db.prepare(`
    INSERT INTO plans (name, description, price_monthly, price_yearly, max_users, max_devices, features)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, description || null, Number(price_monthly), Number(price_yearly || price_monthly * 10), Number(max_users), Number(max_devices), featuresJson);

  return res.status(201).json({
    id: ins.lastInsertRowid,
    name,
    description,
    price_monthly: Number(price_monthly),
    price_yearly: Number(price_yearly || price_monthly * 10),
    features: Array.isArray(features) ? features : [features]
  });
});

router.put('/plans/:id', async (req: AuthRequest, res: Response) => {
  const { name, description, price_monthly, price_yearly, max_users, max_devices, features, active } = req.body;

  const featuresJson = Array.isArray(features) ? JSON.stringify(features) : undefined;

  await db.prepare(`
    UPDATE plans
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        price_monthly = COALESCE(?, price_monthly),
        price_yearly = COALESCE(?, price_yearly),
        max_users = COALESCE(?, max_users),
        max_devices = COALESCE(?, max_devices),
        features = COALESCE(?, features),
        active = COALESCE(?, active)
    WHERE id = ?
  `).run(
    name || null, description || null, price_monthly ? Number(price_monthly) : null,
    price_yearly ? Number(price_yearly) : null, max_users ? Number(max_users) : null,
    max_devices ? Number(max_devices) : null, featuresJson || null,
    active !== undefined ? Number(active) : null, req.params.id
  );

  return res.json({ success: true });
});

// Payments List & Manual Approval
router.get('/payments', async (req: AuthRequest, res: Response) => {
  const payments = await db.prepare(`
    SELECT sp.*, c.name as company_name, c.trade_name
    FROM subscription_payments sp
    JOIN companies c ON c.id = sp.company_id
    ORDER BY sp.id DESC
  `).all();

  return res.json(payments);
});

router.post('/payments/:id/approve', async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id;

  const payment = await db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  const tx = db.transaction(async () => {
    await db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(paymentId);

    const company = await db.prepare('SELECT access_expires_at FROM companies WHERE id = ?').get(payment.company_id) as any;

    let base = new Date();
    if (company.access_expires_at && new Date(company.access_expires_at) > base) {
      base = new Date(company.access_expires_at);
    }

    let days = 30;
    if (payment.billing_cycle === 'quarterly') days = 90;
    else if (payment.billing_cycle === 'semiannual') days = 180;
    else if (payment.billing_cycle === 'annual') days = 365;

    base.setDate(base.getDate() + days);

    await db.prepare(`
      UPDATE companies
      SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
      WHERE id = ?
    `).run(payment.plan_id, payment.plan_name, base.toISOString(), payment.company_id);

    await logAudit(req.user!.id, req.user!.name, 'SaaS Admin', 'Aprovação Manual', `Aprovou a fatura #${paymentId} para a loja ID ${payment.company_id}`, Number(paymentId));
    return base.toISOString();
  });

  const newDate = await tx();
  return res.json({ success: true, access_expires_at: newDate });
});

// Gateway API Settings
router.get('/gateways', async (req: AuthRequest, res: Response) => {
  const settings = await db.prepare('SELECT * FROM platform_settings WHERE id = 1').get();
  return res.json(settings || {});
});

router.put('/gateways', async (req: AuthRequest, res: Response) => {
  const {
    active_gateway, mercadopago_token, mercadopago_public_key,
    infinitepay_api_key, infinitepay_handle, infinitepay_environment,
    asaas_api_key, asaas_environment, pix_key, pix_key_type,
    pix_receiver_name, trial_days_default
  } = req.body;

  await db.prepare(`
    UPDATE platform_settings
    SET active_gateway = ?,
        mercadopago_token = ?,
        mercadopago_public_key = ?,
        infinitepay_api_key = ?,
        infinitepay_handle = ?,
        infinitepay_environment = ?,
        asaas_api_key = ?,
        asaas_environment = ?,
        pix_key = ?,
        pix_key_type = ?,
        pix_receiver_name = ?,
        trial_days_default = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    active_gateway || 'manual_pix',
    mercadopago_token || null,
    mercadopago_public_key || null,
    infinitepay_api_key || null,
    infinitepay_handle || null,
    infinitepay_environment || 'production',
    asaas_api_key || null,
    asaas_environment || 'sandbox',
    pix_key || null,
    pix_key_type || 'CNPJ',
    pix_receiver_name || null,
    Number(trial_days_default) || 7
  );

  await logAudit(req.user!.id, req.user!.name, 'SaaS Admin', 'Configurações de Gateway', 'Atualizou credenciais de API de pagamento (Mercado Pago / InfinitePay / Asaas / PIX)');

  return res.json({ success: true, active_gateway: active_gateway || 'manual_pix' });
});

export default router;
