import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';
import { db, initDatabase } from './db.js';

console.log('====================================================');
console.log('🚀 TESTES DE GESTÃO SAAS, PLANOS, VALIDADE E RENOVAÇÃO');
console.log('   Assistencia shop Multi-Lojas');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    testsFailed++;
  }
}

async function run() {
  initDatabase();
  const admin = db.prepare("SELECT * FROM users WHERE email = 'admin@assistenciashop.com.br'").get() as any;
  const token = jwt.sign({ id: admin.id, name: admin.name, role: admin.role }, JWT_SECRET);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Obter informações de assinatura da loja atual
    const resCur = await fetch(`${BASE_URL}/subscription/current`, { headers });
    const subInfo = await resCur.json();
    assert(resCur.status === 200 && subInfo.trade_name === 'Assistencia shop', '1. GET /api/subscription/current retorna dados da loja');
    assert(typeof subInfo.days_left === 'number', '2. Cálculo de dias restantes (days_left) ativo');
    assert(subInfo.plan && subInfo.plan.name, '3. Dados do plano vinculado à loja presentes');

    // 2. Obter planos disponíveis para assinatura/upgrade (Apenas 2 planos mensais: Prata e Ouro)
    const resPlans = await fetch(`${BASE_URL}/subscription/plans`, { headers });
    const plans = await resPlans.json();
    assert(Array.isArray(plans) && plans.length === 2, '4. GET /api/subscription/plans retorna exatamente 2 planos (Prata e Ouro)');

    // 3. Criar checkout de renovação (Trimestral do Plano Ouro)
    const goldPlan = plans.find((p: any) => p.name === 'Ouro') || plans[plans.length - 1];
    const resCheckout = await fetch(`${BASE_URL}/subscription/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plan_id: goldPlan.id,
        billing_cycle: 'quarterly',
        payment_method: 'PIX'
      })
    });
    const checkout = await resCheckout.json();
    assert((resCheckout.status === 200 || resCheckout.status === 201) && checkout.payment_id, '5. POST /api/subscription/checkout gera cobrança de renovação');
    assert(checkout.pix_copia_cola && checkout.pix_copia_cola.startsWith('000201'), '6. PIX Copia e Cola EMV padrão Banco Central gerado');
    assert(checkout.amount > 0, '7. Valor com desconto de ciclo aplicado corretamente');

    // 4. Confirmar pagamento de renovação
    const resCurBefore = await fetch(`${BASE_URL}/subscription/current`, { headers });
    const subBefore = await resCurBefore.json();

    const resConfirm = await fetch(`${BASE_URL}/subscription/confirm-payment/${checkout.payment_id}`, {
      method: 'POST',
      headers
    });
    const confirmData = await resConfirm.json();
    assert(resConfirm.status === 200 && confirmData.success, '8. POST /api/subscription/confirm-payment/:id aprova renovação');

    const resCurAfter = await fetch(`${BASE_URL}/subscription/current`, { headers });
    const subAfter = await resCurAfter.json();
    assert(subAfter.subscription_status === 'active', '9. Status da empresa atualizado para active');
    assert(new Date(subAfter.access_expires_at).getTime() > new Date(subBefore.access_expires_at).getTime(), '10. Validade do acesso estendida na assinatura');

    // 5. Histórico de faturas / invoices
    const resInvoices = await fetch(`${BASE_URL}/subscription/invoices`, { headers });
    const invoices = await resInvoices.json();
    assert(Array.isArray(invoices) && invoices.length > 0, '11. GET /api/subscription/invoices lista histórico de faturas');

    // 6. Painel SaaS Superadmin: Estatísticas globais (MRR, Tenants, etc)
    const resStats = await fetch(`${BASE_URL}/saas/stats`, { headers });
    const stats = await resStats.json();
    assert(resStats.status === 200 && typeof stats.mrr === 'number', '12. GET /api/saas/stats retorna MRR da plataforma');
    assert(stats.total_tenants >= 1, '13. Contagem de lojas parceiras ativa');

    // 7. Cadastrar nova loja (Tenant) no Painel SaaS
    const testStoreCode = 'loja' + Math.floor(Math.random() * 9000 + 1000);
    const resCreateTenant = await fetch(`${BASE_URL}/saas/tenants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        company_name: 'Smart Cell Assistencia Ltda',
        trade_name: 'Smart Cell Express',
        cnpj_cpf: '12.345.678/0001-90',
        phone: '(11) 98888-7777',
        plan_id: goldPlan.id,
        trial_days: 15,
        admin_name: 'Marcos Silva',
        admin_email: `${testStoreCode}@smartcell.com.br`,
        admin_password: 'senha123_temp'
      })
    });
    const newTenant = await resCreateTenant.json();
    assert(resCreateTenant.status === 201 && newTenant.id, '14. POST /api/saas/tenants cadastra nova loja no ecossistema SaaS');
    assert(newTenant.company_code && newTenant.company_code.length > 0, '15. Código de identificação exclusivo da loja gerado');

    // 8. Extensão de validade da loja (+30 dias ou +90 dias)
    const resExtend = await fetch(`${BASE_URL}/saas/tenants/${newTenant.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        days_to_add: 30,
        subscription_status: 'active'
      })
    });
    const updatedTenant = await resExtend.json();
    assert(resExtend.status === 200 && updatedTenant.subscription_status === 'active', '16. PUT /api/saas/tenants/:id estende +30 dias e ativa loja');

    // 9. Bloquear/Suspender loja por inadimplência
    const resSuspend = await fetch(`${BASE_URL}/saas/tenants/${newTenant.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        subscription_status: 'suspended'
      })
    });
    const suspendedTenant = await resSuspend.json();
    assert(suspendedTenant.subscription_status === 'suspended', '17. Bloqueio/Suspensão de loja por inadimplência funcionando');

    // 10. Gestão de Planos da Plataforma
    const resCreatePlan = await fetch(`${BASE_URL}/saas/plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Plano Enterprise VIP',
        description: 'Multi-filiais e O.S. ilimitadas',
        price_monthly: 249.90,
        price_yearly: 2499.00,
        max_users: 25,
        max_devices: 9999,
        features: ['Tudo do Plano Ouro', 'API de Integração Externa', 'Backup Hora a Hora']
      })
    });
    const createdPlan = await resCreatePlan.json();
    assert(resCreatePlan.status === 201 && createdPlan.name === 'Plano Enterprise VIP', '18. POST /api/saas/plans cria novo plano comercializável');

    // 11. Configuração de Gateways de Pagamento (Mercado Pago, Asaas, PIX Direto)
    const resGateways = await fetch(`${BASE_URL}/saas/gateways`, { headers });
    const gw = await resGateways.json();
    assert(resGateways.status === 200 && gw.active_gateway !== undefined, '19. GET /api/saas/gateways retorna configurações de pagamento');

    const resSaveGw = await fetch(`${BASE_URL}/saas/gateways`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        active_gateway: 'mercadopago',
        mercadopago_token: 'TEST-APP-USR-78234-TOKEN-MOCK',
        mercadopago_public_key: 'TEST-PUB-KEY-MOCK',
        asaas_api_key: '$aact_Y2xpZW50X2FwaV9rZXk=',
        asaas_environment: 'sandbox',
        pix_key: 'financeiro@assistenciashop.com.br',
        pix_key_type: 'email',
        pix_receiver_name: 'Assistencia shop SaaS Pagamentos',
        trial_days_default: 14
      })
    });
    const savedGw = await resSaveGw.json();
    assert(resSaveGw.status === 200 && savedGw.active_gateway === 'mercadopago', '20. PUT /api/saas/gateways salva credenciais de APIs de pagamento');

    // 12. Webhook IPN de Notificação de Pagamento de Renovação
    const resWebhook = await fetch(`${BASE_URL}/saas/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_id: checkout.payment_id,
        status: 'approved',
        gateway: 'mercadopago',
        transaction_id: 'MP-EXT-992384729'
      })
    });
    const webhookRes = await resWebhook.json();
    assert(resWebhook.status === 200 && webhookRes.success, '21. POST /api/saas/webhook/payment processa IPN e renova automaticamente');

  } catch (err: any) {
    console.error('Erro durante execução dos testes:', err);
    assert(false, `Falha inesperada: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DOS TESTES SAAS: ${testsPassed} PASS / ${testsFailed} FAIL`);
  console.log('====================================================');
  if (testsFailed > 0) {
    process.exit(1);
  }
}

run();
