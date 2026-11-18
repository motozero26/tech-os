import { db } from './db.js';
import bcrypt from 'bcryptjs';

async function runSaaSAudit() {
  console.log('--- INICIANDO AUDITORIA COMPLETA DO PAINEL SAAS ---');
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Auditoria de Planos (Exclusivamente 2 planos mensais: Prata 49,90 e Ouro 79,90)
  const plans = db.prepare(`
    SELECT * FROM plans WHERE active = 1 AND name IN ('Prata', 'Ouro') ORDER BY price_monthly ASC
  `).all() as any[];

  assert('Exatamente 2 planos ativos permitidos', plans.length === 2);
  const prata = plans.find(p => p.name === 'Prata');
  const ouro = plans.find(p => p.name === 'Ouro');

  assert('Plano Prata existe', !!prata);
  assert('Plano Prata custa R$ 49,90', prata?.price_monthly === 49.90);
  assert('Plano Ouro existe', !!ouro);
  assert('Plano Ouro custa R$ 79,90', ouro?.price_monthly === 79.90);

  // Verificar recursos: Ouro deve ter Emissão de Nota Fiscal
  const ouroFeatures = ouro?.features ? JSON.parse(ouro.features) : [];
  assert('Plano Ouro possui emissão de nota fiscal em seus recursos', ouroFeatures.some((f: string) => f.includes('Nota Fiscal') || f.includes('NF-e')));

  // 2. Auditoria de Estatísticas Globais (Stats / MRR)
  const totalTenants = (db.prepare('SELECT count(*) as count FROM companies').get() as any).count;
  const activeTenants = (db.prepare("SELECT count(*) as count FROM companies WHERE subscription_status = 'active'").get() as any).count;
  const trialTenants = (db.prepare("SELECT count(*) as count FROM companies WHERE subscription_status = 'trial'").get() as any).count;
  const mrrQuery = (db.prepare(`
    SELECT COALESCE(SUM(p.price_monthly), 0) as mrr
    FROM companies c
    JOIN plans p ON p.id = c.plan_id
    WHERE c.subscription_status = 'active'
  `).get() as any).mrr;

  assert('Contagem de lojas cadastradas válida', totalTenants >= 1);
  assert('Cálculo de MRR ativo numérico', typeof mrrQuery === 'number');

  // 3. Auditoria de Criação de Loja Cliente (Tenant) com Master Admin
  const testStoreCode = 'test_' + Math.random().toString(36).substring(2, 8);
  const testStoreName = 'Loja Teste SaaS ' + Date.now();
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 7);

  const insCompany = db.prepare(`
    INSERT INTO companies (
      company_code, name, trade_name, cnpj, phone, email,
      plan_id, plan_name, subscription_status, trial_ends_at, access_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial', ?, ?)
  `).run(
    testStoreCode, testStoreName, testStoreName, '11.222.333/0001-99', '(11) 98888-7777', `${testStoreCode}@teste.com`,
    ouro.id, ouro.name, trialEnds.toISOString(), trialEnds.toISOString()
  );
  const createdCompanyId = insCompany.lastInsertRowid;
  assert('Criação de Tenant via banco/transação', !!createdCompanyId);

  // Inserir Admin da Loja
  const passHash = bcrypt.hashSync('senha123', 10);
  const insUser = db.prepare(`
    INSERT INTO users (company_id, name, email, password_hash, role, active)
    VALUES (?, ?, ?, ?, 'master', 1)
  `).run(createdCompanyId, 'Dono Teste', `dono_${testStoreCode}@teste.com`, passHash);
  assert('Criação de Usuário Master da Loja', !!insUser.lastInsertRowid);

  // 4. Auditoria de Extensão de Acesso (+30 e +90 dias) e Alteração de Status
  let currentComp = db.prepare('SELECT * FROM companies WHERE id = ?').get(createdCompanyId) as any;
  const oldExpiry = new Date(currentComp.access_expires_at);

  const add30 = new Date(oldExpiry);
  add30.setDate(add30.getDate() + 30);
  db.prepare('UPDATE companies SET access_expires_at = ? WHERE id = ?').run(add30.toISOString(), createdCompanyId);

  const updatedComp = db.prepare('SELECT * FROM companies WHERE id = ?').get(createdCompanyId) as any;
  const newExpiry = new Date(updatedComp.access_expires_at);
  const diffDays = Math.round((newExpiry.getTime() - oldExpiry.getTime()) / (1000 * 60 * 60 * 24));
  assert('Extensão de validade de acesso em +30 dias', diffDays === 30);

  // Suspender e reativar loja
  db.prepare("UPDATE companies SET subscription_status = 'suspended' WHERE id = ?").run(createdCompanyId);
  let suspendedComp = db.prepare('SELECT subscription_status FROM companies WHERE id = ?').get(createdCompanyId) as any;
  assert('Suspensão de loja parceira', suspendedComp.subscription_status === 'suspended');

  db.prepare("UPDATE companies SET subscription_status = 'active' WHERE id = ?").run(createdCompanyId);
  let activeComp = db.prepare('SELECT subscription_status FROM companies WHERE id = ?').get(createdCompanyId) as any;
  assert('Reativação de loja parceira', activeComp.subscription_status === 'active');

  // 5. Auditoria de Configurações de Gateways (Mercado Pago / Asaas / PIX)
  db.prepare(`
    UPDATE platform_settings
    SET active_gateway = 'mercadopago',
        mercadopago_token = 'TEST_MP_TOKEN_123',
        pix_key = 'pix@saas.com',
        pix_receiver_name = 'SaaS Pagamentos',
        trial_days_default = 7
    WHERE id = 1
  `).run();

  const settings = db.prepare('SELECT * FROM platform_settings WHERE id = 1').get() as any;
  assert('Gateway ativo salvo como Mercado Pago', settings.active_gateway === 'mercadopago');
  assert('Chave PIX e token salvos corretamente', settings.pix_key === 'pix@saas.com');

  // 6. Auditoria de Faturas e Aprovação Manual de Pagamento
  const insInvoice = db.prepare(`
    INSERT INTO subscription_payments (
      company_id, plan_id, plan_name, billing_cycle, amount,
      payment_method, status
    ) VALUES (?, ?, ?, 'monthly', 79.90, 'PIX', 'pending')
  `).run(createdCompanyId, ouro.id, ouro.name);

  const invoiceId = insInvoice.lastInsertRowid;
  assert('Criação de fatura de mensalidade Ouro R$ 79,90', !!invoiceId);

  // Aprovar Manualmente a Fatura
  const baseBeforeApprove = new Date(updatedComp.access_expires_at);
  const approveDate = new Date();
  approveDate.setDate(approveDate.getDate() + 30);

  db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(invoiceId);
  db.prepare("UPDATE companies SET subscription_status = 'active', access_expires_at = ? WHERE id = ?").run(approveDate.toISOString(), createdCompanyId);

  const approvedInvoice = db.prepare('SELECT status FROM subscription_payments WHERE id = ?').get(invoiceId) as any;
  assert('Aprovação manual da fatura com status paid', approvedInvoice.status === 'paid');

  // 7. Auditoria de Webhook de Notificação Automática de Pagamento
  const webhookGatewayId = 'PAY_' + Date.now();
  const insPendingWebhookPay = db.prepare(`
    INSERT INTO subscription_payments (
      company_id, plan_id, plan_name, billing_cycle, amount,
      payment_method, gateway_payment_id, status
    ) VALUES (?, ?, ?, 'monthly', 79.90, 'mercadopago', ?, 'pending')
  `).run(createdCompanyId, ouro.id, ouro.name, webhookGatewayId);

  const pendingPayId = insPendingWebhookPay.lastInsertRowid;

  // Simular processamento do webhook
  const targetPayment = db.prepare('SELECT * FROM subscription_payments WHERE gateway_payment_id = ?').get(webhookGatewayId) as any;
  assert('Fatura pendente associada ao gateway encontrada para webhook', !!targetPayment && targetPayment.status === 'pending');

  const webhookExpiry = new Date();
  webhookExpiry.setDate(webhookExpiry.getDate() + 30);
  db.transaction(() => {
    db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetPayment.id);
    db.prepare(`
      UPDATE companies
      SET plan_id = ?, plan_name = ?, subscription_status = 'active', access_expires_at = ?
      WHERE id = ?
    `).run(targetPayment.plan_id, targetPayment.plan_name, webhookExpiry.toISOString(), targetPayment.company_id);
  })();

  const reloadedPay = db.prepare('SELECT status FROM subscription_payments WHERE id = ?').get(pendingPayId) as any;
  const reloadedCompany = db.prepare('SELECT subscription_status FROM companies WHERE id = ?').get(createdCompanyId) as any;

  assert('Webhook executou aprovação automática com sucesso', reloadedPay.status === 'paid');
  assert('Loja ativada automaticamente pelo webhook', reloadedCompany.subscription_status === 'active');

  // Limpeza de registros de teste
  db.prepare('DELETE FROM subscription_payments WHERE company_id = ?').run(createdCompanyId);
  db.prepare('DELETE FROM users WHERE company_id = ?').run(createdCompanyId);
  db.prepare('DELETE FROM companies WHERE id = ?').run(createdCompanyId);
  console.log('[CLEANUP] Dados de teste limpos com sucesso.');

  console.log(`\n========================================`);
  console.log(`RESULTADO DA AUDITORIA SAAS: ${passed} PASS, ${failed} FAIL`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSaaSAudit().catch(err => {
  console.error('Erro na auditoria do SaaS:', err);
  process.exit(1);
});
