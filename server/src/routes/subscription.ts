import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get current store subscription
router.get('/current', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const company = db.prepare(`
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
      features: company.features ? JSON.parse(company.features) : []
    }
  });
});

// Get available plans for renewal / upgrade (Strictly the 2 official plans: Prata and Ouro)
router.get('/plans', (req: AuthRequest, res: Response) => {
  const plans = db.prepare("SELECT * FROM plans WHERE active = 1 AND name IN ('Prata', 'Ouro') ORDER BY price_monthly ASC").all() as any[];
  const formatted = plans.map(p => ({
    ...p,
    features: p.features ? JSON.parse(p.features) : []
  }));
  return res.json(formatted);
});

// Create checkout invoice for renewal
router.post('/checkout', async (req: AuthRequest, res: Response) => {
  const { plan_id, billing_cycle = 'monthly', payment_method = 'PIX' } = req.body;

  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
  if (!plan) {
    return res.status(404).json({ error: 'Plano não encontrado' });
  }

  const platSettings = db.prepare('SELECT * FROM platform_settings WHERE id = 1').get() as any;

  // Calculate pricing based on billing cycle
  let amount = plan.price_monthly;
  let monthsToAdd = 1;

  if (billing_cycle === 'quarterly') {
    amount = (plan.price_monthly * 3) * 0.95; // 5% discount
    monthsToAdd = 3;
  } else if (billing_cycle === 'semiannual') {
    amount = (plan.price_monthly * 6) * 0.90; // 10% discount
    monthsToAdd = 6;
  } else if (billing_cycle === 'annual') {
    amount = plan.price_yearly || ((plan.price_monthly * 12) * 0.80); // 20% discount
    monthsToAdd = 12;
  }

  const companyId = req.user?.company_id || 1;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;

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

  const ins = db.prepare(`
    INSERT INTO subscription_payments (
      company_id, plan_id, plan_name, billing_cycle, amount,
      payment_method, payment_gateway, gateway_payment_id, pix_copia_cola, pix_qrcode, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    companyId, plan.id, plan.name, billing_cycle, amount,
    payment_method, gatewayUsed, gatewayPaymentId, pixCopiaCola, pixQrCodeBase64
  );

  const paymentId = ins.lastInsertRowid;

  logAudit(req.user!.id, req.user!.name, 'Assinatura', 'Checkout Gerado', `Fatura #${paymentId} gerada para o plano ${plan.name} (${billing_cycle}) no valor de R$ ${amount.toFixed(2)} [${gatewayUsed}]`, Number(paymentId));

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

  const payment = db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  const companyId = req.user?.company_id || 1;
  if (req.user?.role !== 'superadmin' && payment.company_id !== companyId) {
    return res.status(403).json({ error: 'Acesso negado a esta fatura' });
  }

  // Already paid
  if (payment.status === 'paid') {
    const comp = db.prepare('SELECT access_expires_at, subscription_status FROM companies WHERE id = ?').get(payment.company_id) as any;
    return res.json({
      status: 'paid',
      activated: true,
      access_expires_at: comp?.access_expires_at,
      subscription_status: comp?.subscription_status
    });
  }

  const platSettings = db.prepare('SELECT * FROM platform_settings WHERE id = 1').get() as any;
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
    const tx = db.transaction(() => {
      db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(payment.id);

      const company = db.prepare('SELECT access_expires_at FROM companies WHERE id = ?').get(payment.company_id) as any;
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

      db.prepare(`
        UPDATE companies
        SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
        WHERE id = ?
      `).run(payment.plan_id, payment.plan_name, newExpiresAt, payment.company_id);

      logAudit(req.user!.id, req.user!.name, 'Assinatura', 'Renovação Gateway Aprovada', `Acesso da loja restaurado via gateway ${payment.payment_gateway} até ${baseDate.toLocaleDateString('pt-BR')}`, Number(payment.id));

      return newExpiresAt;
    });

    const newExpiresAt = tx();
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
router.post('/confirm-payment/:id', (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id;

  const payment = db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Fatura não encontrada' });
  }

  const companyId = req.user?.company_id || 1;
  if (req.user?.role !== 'superadmin' && payment.company_id !== companyId) {
    return res.status(403).json({ error: 'Acesso negado a esta fatura' });
  }

  const tx = db.transaction(() => {
    // 1. Mark payment as paid
    db.prepare(`
      UPDATE subscription_payments
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(paymentId);

    // 2. Calculate new expiration date
    const company = db.prepare('SELECT access_expires_at, subscription_status FROM companies WHERE id = ?').get(payment.company_id) as any;

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
    db.prepare(`
      UPDATE companies
      SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
      WHERE id = ?
    `).run(payment.plan_id, payment.plan_name, newExpiresAt, payment.company_id);

    logAudit(req.user!.id, req.user!.name, 'Assinatura', 'Renovação Aprovada', `Acesso da loja renovado com sucesso até ${baseDate.toLocaleDateString('pt-BR')}`, Number(paymentId));

    return { success: true, new_expires_at: newExpiresAt, days_added: daysToAdd };
  });

  const result = tx();
  return res.json(result);
});

// List past subscription invoices for this company
router.get('/invoices', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const invoices = db.prepare(`
    SELECT * FROM subscription_payments
    WHERE company_id = ?
    ORDER BY id DESC
  `).all(companyId);

  return res.json(invoices);
});

export default router;
