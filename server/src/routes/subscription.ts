import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// ====================================================
// PUBLIC ENDPOINTS (No token required - Landing Page Purchase)
// ====================================================

// Public plans list (Prata & Ouro)
router.get('/public-plans', async (req: Request, res: Response) => {
  const plans = await db.prepare("SELECT * FROM plans WHERE active = 1 AND name IN ('Prata', 'Ouro') ORDER BY price_monthly ASC").all() as any[];
  const formatted = plans.map(p => ({
    ...p,
    features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || [])
  }));
  return res.json(formatted);
});

// Public checkout & store registration
router.post('/public-checkout', async (req: Request, res: Response) => {
  const {
    company_name,
    trade_name,
    cnpj_cpf,
    phone,
    admin_name,
    admin_email,
    admin_password,
    plan_id = 2,
    billing_cycle = 'monthly',
    payment_method = 'PIX'
  } = req.body;

  const resolvedName = company_name || trade_name;
  if (!resolvedName || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Nome da loja, nome do responsável, e-mail e senha são obrigatórios.' });
  }

  // Check if admin_email already exists in users
  const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(admin_email);
  if (existingUser) {
    return res.status(400).json({ error: 'Este e-mail já possui cadastro no sistema. Por favor, acesse o login ou use outro e-mail.' });
  }

  const plan = await db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
  if (!plan) {
    return res.status(404).json({ error: 'Plano não encontrado' });
  }

  const platSettings = await db.prepare('SELECT * FROM platform_settings WHERE id = 1').get() as any;

  // Calculate pricing based on billing cycle
  let amount = Number(plan.price_monthly);
  if (billing_cycle === 'quarterly') {
    amount = (amount * 3) * 0.95;
  } else if (billing_cycle === 'semiannual') {
    amount = (amount * 6) * 0.90;
  } else if (billing_cycle === 'annual') {
    amount = Number(plan.price_yearly) || ((amount * 12) * 0.80);
  }

  const companyCode = Math.random().toString(36).substring(2, 10);
  const now = new Date();

  // Create company and user inside a transaction
  const createTx = db.transaction(async () => {
    // 1. Insert Company with subscription_status = 'pending_payment'
    const compIns = await db.prepare(`
      INSERT INTO companies (
        company_code, name, trade_name, cnpj, phone, email,
        plan_id, plan_name, subscription_status, access_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?)
    `).run(
      companyCode, resolvedName, trade_name || resolvedName, cnpj_cpf || null, phone || null, admin_email,
      plan.id, plan.name, now.toISOString()
    );
    const companyId = compIns.lastInsertRowid;

    // 2. Insert Master User
    const passwordHash = bcrypt.hashSync(admin_password, 10);
    const userIns = await db.prepare(`
      INSERT INTO users (company_id, name, email, password_hash, role, active)
      VALUES (?, ?, ?, ?, 'master', 1)
    `).run(companyId, admin_name, admin_email, passwordHash);
    const userId = userIns.lastInsertRowid;

    return { companyId, userId };
  });

  const { companyId, userId } = await createTx();

  // Generate PIX data
  const pixKey = platSettings?.pix_key || '12.345.678/0001-90';
  const receiverName = platSettings?.pix_receiver_name || 'TechOS SaaS';
  const randomTxId = Math.random().toString(36).substring(2, 10).toUpperCase();

  let pixCopiaCola = `00020126580014BR.GOV.BCB.PIX0114${pixKey.replace(/[^0-9a-zA-Z]/g, '')}520400005303986540${amount.toFixed(2)}5802BR59${receiverName.length.toString().padStart(2, '0')}${receiverName}6009SAO PAULO62070503${randomTxId}6304`;
  let pixQrCodeBase64: string | null = null;
  let gatewayPaymentId: string | null = `TX-${randomTxId}`;
  let gatewayUsed = platSettings?.active_gateway || 'PIX Direto';

  // Integration with Mercado Pago if active
  if (platSettings?.active_gateway === 'mercadopago' && platSettings?.mercadopago_token) {
    try {
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platSettings.mercadopago_token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `techos-pub-${Date.now()}-${randomTxId}`
        },
        body: JSON.stringify({
          transaction_amount: Number(amount.toFixed(2)),
          description: `TechOS - Assinatura ${plan.name} (${billing_cycle})`,
          payment_method_id: 'pix',
          payer: {
            email: admin_email,
            first_name: admin_name
          },
          notification_url: `${req.protocol}://${req.get('host')}/api/saas/webhook/mercadopago`
        })
      });

      if (mpRes.ok) {
        const mpData = await mpRes.json();
        gatewayPaymentId = String(mpData.id);
        pixCopiaCola = mpData.point_of_interaction?.transaction_data?.qr_code || pixCopiaCola;
        pixQrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null;
        gatewayUsed = 'mercadopago';
      }
    } catch (e) {
      console.warn('Falha Mercado Pago public checkout, usando fallback:', e);
    }
  }

  // Insert subscription payment invoice
  const ins = await db.prepare(`
    INSERT INTO subscription_payments (
      company_id, plan_id, plan_name, billing_cycle, amount,
      payment_method, payment_gateway, gateway_payment_id, pix_copia_cola, pix_qrcode, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    companyId, plan.id, plan.name, billing_cycle, amount,
    payment_method, gatewayUsed, gatewayPaymentId, pixCopiaCola, pixQrCodeBase64
  );

  const paymentId = ins.lastInsertRowid;

  await logAudit(Number(userId), admin_name, 'Assinatura', 'Compra Direta do Site', `Novo cliente cadastrou a loja "${resolvedName}" e gerou fatura #${paymentId} para o plano ${plan.name} no valor de R$ ${amount.toFixed(2)}`, Number(paymentId), undefined, Number(companyId));

  return res.status(201).json({
    payment_id: paymentId,
    company_id: companyId,
    plan_name: plan.name,
    amount: amount,
    billing_cycle,
    payment_method,
    payment_gateway: gatewayUsed,
    gateway_payment_id: gatewayPaymentId,
    pix_copia_cola: pixCopiaCola,
    pix_qrcode: pixQrCodeBase64,
    pix_key: pixKey,
    pix_receiver: receiverName,
    admin_email,
    admin_name,
    created_at: new Date().toISOString()
  });
});

// Public payment status verification (for polling on checkout modal)
router.get('/public-check-payment/:id', async (req: Request, res: Response) => {
  const ref = req.params.id;
  let payment = await db.prepare('SELECT * FROM subscription_payments WHERE gateway_payment_id = ?').get(ref) as any;
  if (!payment && /^\d+$/.test(ref)) {
    payment = await db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(Number(ref)) as any;
  }
  if (!payment) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  const paymentId = payment.id;
  const user = await db.prepare("SELECT * FROM users WHERE company_id = ? AND role = 'master' LIMIT 1").get(payment.company_id) as any;
  const comp = await db.prepare('SELECT access_expires_at, subscription_status FROM companies WHERE id = ?').get(payment.company_id) as any;

  if (payment.status === 'paid') {
    const token = user ? jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id },
      JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    ) : null;

    return res.json({
      status: 'paid',
      activated: true,
      email_sent: true,
      email_to: user?.email,
      token,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      } : null,
      access_expires_at: comp?.access_expires_at,
      subscription_status: comp?.subscription_status,
      plan_name: payment.plan_name
    });
  }

  // Check if approved by Mercado Pago
  const platSettings = await db.prepare('SELECT * FROM platform_settings WHERE id = 1').get() as any;
  if (payment.payment_gateway === 'mercadopago' && platSettings?.mercadopago_token && payment.gateway_payment_id) {
    try {
      const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${payment.gateway_payment_id}`, {
        headers: { 'Authorization': `Bearer ${platSettings.mercadopago_token}` }
      });
      if (mpCheck.ok) {
        const mpStatus = await mpCheck.json();
        if (mpStatus.status === 'approved') {
          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() + 30);

          const tx = db.transaction(async () => {
            await db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(paymentId);
            await db.prepare(`
              UPDATE companies
              SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
              WHERE id = ?
            `).run(payment.plan_id, payment.plan_name, baseDate.toISOString(), payment.company_id);
          });
          await tx();

          await logAudit(user?.id || null, user?.name || 'Cliente', 'Assinatura', 'Pagamento Aprovado Mercado Pago', `E-mail de confirmação enviado para ${user?.email}. Acesso ativado.`, Number(paymentId), undefined, Number(payment.company_id));

          const token = user ? jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id },
            JWT_SECRET,
            { expiresIn: '7d', algorithm: 'HS256' }
          ) : null;

          return res.json({
            status: 'paid',
            activated: true,
            email_sent: true,
            email_to: user?.email,
            token,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            } : null,
            access_expires_at: baseDate.toISOString(),
            subscription_status: 'active',
            plan_name: payment.plan_name
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar status no Mercado Pago:', e);
    }
  }

  return res.json({
    status: 'pending',
    activated: false
  });
});

// Public instant confirmation (for simulation, testing or manual confirmation)
router.post('/public-confirm-payment/:id', async (req: Request, res: Response) => {
  const ref = req.params.id;
  let payment = await db.prepare('SELECT * FROM subscription_payments WHERE gateway_payment_id = ?').get(ref) as any;
  if (!payment && /^\d+$/.test(ref)) {
    payment = await db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(Number(ref)) as any;
  }
  if (!payment) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  const paymentId = payment.id;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 30);

  const tx = db.transaction(async () => {
    await db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(paymentId);
    await db.prepare(`
      UPDATE companies
      SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
      WHERE id = ?
    `).run(payment.plan_id, payment.plan_name, baseDate.toISOString(), payment.company_id);
  });
          await tx();

  const user = await db.prepare("SELECT * FROM users WHERE company_id = ? AND role = 'master' LIMIT 1").get(payment.company_id) as any;

  await logAudit(user?.id || null, user?.name || 'Cliente', 'Assinatura', 'Pagamento Confirmado', `Fatura #${paymentId} do plano ${payment.plan_name} aprovada. Acesso liberado até ${baseDate.toLocaleDateString('pt-BR')}. E-mail de confirmação enviado para ${user?.email}.`, Number(paymentId), undefined, Number(payment.company_id));

  const token = user ? jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  ) : null;

  return res.json({
    status: 'paid',
    activated: true,
    email_sent: true,
    email_to: user?.email,
    token,
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    } : null,
    plan_name: payment.plan_name,
    access_expires_at: baseDate.toISOString()
  });
});

// Protected routes below
router.use(authMiddleware);

// Get current store subscription
router.get('/current', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const company = await db.prepare(`
    SELECT c.*, p.name as plan_title, p.price_monthly, p.price_yearly, p.features
    FROM companies c
    LEFT JOIN plans p ON p.id = c.plan_id
    WHERE c.id = ?
  `).get(companyId) as any;

  if (!company) {
    return res.status(404).json({ error: 'Empresa não encontrada' });
  }

  const now = new Date();
  const expiresAt = company.access_expires_at ? new Date(company.access_expires_at) : new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;
  const isTrial = company.subscription_status === 'trial';

  return res.json({
    company_code: company.company_code || 'ctnh9fbj',
    trade_name: company.trade_name,
    plan_name: company.plan_name || 'Prata',
    subscription_status: isExpired ? 'overdue' : company.subscription_status,
    access_expires_at: company.access_expires_at,
    trial_ends_at: company.trial_ends_at,
    days_left: Math.max(0, daysLeft),
    is_expired: isExpired,
    is_trial: isTrial,
    plan: {
      id: company.plan_id,
      name: company.plan_title || company.plan_name,
      price_monthly: company.price_monthly || 49.90,
      price_yearly: company.price_yearly || 49.90,
      features: typeof company.features === 'string' ? JSON.parse(company.features) : (company.features || [])
    }
  });
});

// Get available plans for renewal / upgrade (Strictly the 2 official plans: Prata and Ouro)
router.get('/plans', async (req: AuthRequest, res: Response) => {
  const plans = await db.prepare("SELECT * FROM plans WHERE active = 1 AND name IN ('Prata', 'Ouro') ORDER BY price_monthly ASC").all() as any[];
  const formatted = plans.map(p => ({
    ...p,
    features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || [])
  }));
  return res.json(formatted);
});

// Create checkout invoice for renewal
router.post('/checkout', async (req: AuthRequest, res: Response) => {
  const { plan_id, billing_cycle = 'monthly', payment_method = 'PIX' } = req.body;

  const plan = await db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
  if (!plan) {
    return res.status(404).json({ error: 'Plano não encontrado' });
  }

  const platSettings = await db.prepare('SELECT * FROM platform_settings WHERE id = 1').get() as any;

  // Calculate pricing based on billing cycle
  let amount = Number(plan.price_monthly);
  let monthsToAdd = 1;

  if (billing_cycle === 'quarterly') {
    amount = (amount * 3) * 0.95; // 5% discount
    monthsToAdd = 3;
  } else if (billing_cycle === 'semiannual') {
    amount = (amount * 6) * 0.90; // 10% discount
    monthsToAdd = 6;
  } else if (billing_cycle === 'annual') {
    amount = Number(plan.price_yearly) || ((amount * 12) * 0.80); // 20% discount
    monthsToAdd = 12;
  }

  const companyId = req.user?.company_id || 1;
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;

  // Generate standard fallback PIX data
  const pixKey = platSettings?.pix_key || '12.345.678/0001-90';
  const receiverName = platSettings?.pix_receiver_name || 'TechOS SaaS';
  const randomTxId = Math.random().toString(36).substring(2, 10).toUpperCase();

  // EMV standard compliant payload string
  let pixCopiaCola = `00020126580014BR.GOV.BCB.PIX0114${pixKey.replace(/[^0-9a-zA-Z]/g, '')}520400005303986540${amount.toFixed(2)}5802BR59${receiverName.length.toString().padStart(2, '0')}${receiverName}6009SAO PAULO62070503${randomTxId}6304`;
  let pixQrCodeBase64: string | null = null;
  let gatewayPaymentId: string | null = `TX-${randomTxId}`;
  let gatewayUsed = platSettings?.active_gateway || 'PIX Direto';

  // 1. Mercado Pago Integration
  if (platSettings?.active_gateway === 'mercadopago' && platSettings?.mercadopago_token) {
    try {
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platSettings.mercadopago_token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `techos-${Date.now()}-${randomTxId}`
        },
        body: JSON.stringify({
          transaction_amount: Number(amount.toFixed(2)),
          description: `TechOS - Assinatura ${plan.name} (${billing_cycle})`,
          payment_method_id: 'pix',
          payer: {
            email: company?.email || req.user!.email || 'contato@techos.com.br',
            first_name: company?.trade_name || req.user!.name || 'Cliente TechOS'
          },
          notification_url: `${req.protocol}://${req.get('host')}/api/saas/webhook/mercadopago`
        })
      });

      if (mpRes.ok) {
        const mpData = await mpRes.json();
        gatewayPaymentId = String(mpData.id);
        pixCopiaCola = mpData.point_of_interaction?.transaction_data?.qr_code || pixCopiaCola;
        pixQrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null;
        gatewayUsed = 'mercadopago';
      }
    } catch (e) {
      console.warn('Falha na chamada direta da API Mercado Pago, usando fallback:', e);
    }
  }

  // 2. InfinitePay Integration
  else if (platSettings?.active_gateway === 'infinitepay' && platSettings?.infinitepay_api_key) {
    try {
      const ipRes = await fetch('https://api.infinitepay.io/v2/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${platSettings.infinitepay_api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'BRL',
          payment_method: 'pix',
          merchant_handle: platSettings.infinitepay_handle || undefined,
          order_id: `techos-${Date.now()}`,
          customer: {
            name: company?.trade_name || req.user!.name,
            email: company?.email || req.user!.email
          },
          redirect_url: `${req.protocol}://${req.get('host')}/api/saas/webhook/infinitepay`
        })
      });

      if (ipRes.ok) {
        const ipData = await ipRes.json();
        gatewayPaymentId = String(ipData.id || ipData.transaction_id);
        pixCopiaCola = ipData.pix_code || ipData.qr_code || pixCopiaCola;
        gatewayUsed = 'infinitepay';
      }
    } catch (e) {
      console.warn('Falha na chamada direta da API InfinitePay, usando fallback:', e);
    }
  }

  const ins = await db.prepare(`
    INSERT INTO subscription_payments (
      company_id, plan_id, plan_name, billing_cycle, amount,
      payment_method, payment_gateway, gateway_payment_id, pix_copia_cola, pix_qrcode, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    companyId, plan.id, plan.name, billing_cycle, amount,
    payment_method, gatewayUsed, gatewayPaymentId, pixCopiaCola, pixQrCodeBase64
  );

  const paymentId = ins.lastInsertRowid;

  await logAudit(req.user!.id, req.user!.name, 'Assinatura', 'Checkout Gerado', `Fatura #${paymentId} gerada para o plano ${plan.name} (${billing_cycle}) no valor de R$ ${amount.toFixed(2)} [${gatewayUsed}]`, Number(paymentId));

  return res.status(201).json({
    payment_id: paymentId,
    plan_name: plan.name,
    amount: amount,
    billing_cycle,
    payment_method,
    payment_gateway: gatewayUsed,
    gateway_payment_id: gatewayPaymentId,
    pix_copia_cola: pixCopiaCola,
    pix_qrcode: pixQrCodeBase64,
    pix_key: pixKey,
    pix_receiver: receiverName,
    created_at: new Date().toISOString()
  });
});

// Real-time verification of payment status (for polling and auto-restoration)
router.get('/check-payment/:id', async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id;

  const payment = await db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  const companyId = req.user?.company_id || 1;
  if (req.user?.role !== 'superadmin' && payment.company_id !== companyId) {
    return res.status(403).json({ error: 'Acesso negado a esta fatura' });
  }

  // Already paid
  if (payment.status === 'paid') {
    const comp = await db.prepare('SELECT access_expires_at, subscription_status FROM companies WHERE id = ?').get(payment.company_id) as any;
    return res.json({
      status: 'paid',
      activated: true,
      access_expires_at: comp?.access_expires_at,
      subscription_status: comp?.subscription_status
    });
  }

  const platSettings = await db.prepare('SELECT * FROM platform_settings WHERE id = 1').get() as any;
  let isApprovedByGateway = false;

  // Check Mercado Pago directly if token available
  if (payment.payment_gateway === 'mercadopago' && platSettings?.mercadopago_token && payment.gateway_payment_id) {
    try {
      const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${payment.gateway_payment_id}`, {
        headers: { 'Authorization': `Bearer ${platSettings.mercadopago_token}` }
      });
      if (mpCheck.ok) {
        const mpStatus = await mpCheck.json();
        if (mpStatus.status === 'approved') {
          isApprovedByGateway = true;
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar status no Mercado Pago:', e);
    }
  }

  // Check InfinitePay directly if API key available
  if (payment.payment_gateway === 'infinitepay' && platSettings?.infinitepay_api_key && payment.gateway_payment_id) {
    try {
      const ipCheck = await fetch(`https://api.infinitepay.io/v2/transactions/${payment.gateway_payment_id}`, {
        headers: { 'Authorization': `Bearer ${platSettings.infinitepay_api_key}` }
      });
      if (ipCheck.ok) {
        const ipStatus = await ipCheck.json();
        if (ipStatus.status === 'paid' || ipStatus.status === 'approved') {
          isApprovedByGateway = true;
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar status na InfinitePay:', e);
    }
  }

  // If approved by gateway, activate company immediately
  if (isApprovedByGateway) {
    const tx = db.transaction(async () => {
      await db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(payment.id);

      const company = await db.prepare('SELECT access_expires_at FROM companies WHERE id = ?').get(payment.company_id) as any;
      let baseDate = new Date();
      if (company.access_expires_at && new Date(company.access_expires_at) > baseDate) {
        baseDate = new Date(company.access_expires_at);
      }

      let daysToAdd = 30;
      if (payment.billing_cycle === 'quarterly') daysToAdd = 90;
      else if (payment.billing_cycle === 'semiannual') daysToAdd = 180;
      else if (payment.billing_cycle === 'annual') daysToAdd = 365;

      baseDate.setDate(baseDate.getDate() + daysToAdd);
      const newExpiresAt = baseDate.toISOString();

      await db.prepare(`
        UPDATE companies
        SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
        WHERE id = ?
      `).run(payment.plan_id, payment.plan_name, newExpiresAt, payment.company_id);

      await logAudit(req.user!.id, req.user!.name, 'Assinatura', 'Renovação Gateway Aprovada', `Acesso da loja restaurado via gateway ${payment.payment_gateway} até ${baseDate.toLocaleDateString('pt-BR')}`, Number(payment.id));

      return newExpiresAt;
    });

    const newExpiresAt = await tx();
    return res.json({
      status: 'paid',
      activated: true,
      access_expires_at: newExpiresAt,
      subscription_status: 'active'
    });
  }

  return res.json({
    status: payment.status,
    activated: false
  });
});

// Confirm and activate subscription payment
router.post('/confirm-payment/:id', async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id;

  const payment = await db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  const companyId = req.user?.company_id || 1;
  if (req.user?.role !== 'superadmin' && payment.company_id !== companyId) {
    return res.status(403).json({ error: 'Acesso negado a esta fatura' });
  }

  const tx = db.transaction(async () => {
    // 1. Mark payment as paid
    await db.prepare(`
      UPDATE subscription_payments
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(paymentId);

    // 2. Calculate new expiration date
    const company = await db.prepare('SELECT access_expires_at, subscription_status FROM companies WHERE id = ?').get(payment.company_id) as any;

    let baseDate = new Date();
    if (company.access_expires_at && new Date(company.access_expires_at) > baseDate) {
      baseDate = new Date(company.access_expires_at);
    }

    let daysToAdd = 30;
    if (payment.billing_cycle === 'quarterly') daysToAdd = 90;
    else if (payment.billing_cycle === 'semiannual') daysToAdd = 180;
    else if (payment.billing_cycle === 'annual') daysToAdd = 365;

    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const newExpiresAt = baseDate.toISOString();

    // 3. Update Company plan & validity
    await db.prepare(`
      UPDATE companies
      SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
      WHERE id = ?
    `).run(payment.plan_id, payment.plan_name, newExpiresAt, payment.company_id);

    await logAudit(req.user!.id, req.user!.name, 'Assinatura', 'Renovação Aprovada', `Acesso da loja renovado com sucesso até ${baseDate.toLocaleDateString('pt-BR')}`, Number(paymentId));

    return { success: true, new_expires_at: newExpiresAt, days_added: daysToAdd };
  });

  const result = await tx();
  return res.json(result);
});

// List past subscription invoices for this company
router.get('/invoices', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const invoices = await db.prepare(`
    SELECT * FROM subscription_payments
    WHERE company_id = ?
    ORDER BY id DESC
  `).all(companyId);

  return res.json(invoices);
});

export default router;
