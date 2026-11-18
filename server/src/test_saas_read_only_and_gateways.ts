import { db } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';

const BASE_URL = 'http://localhost:5000/api';

async function runReadOnlyAndGatewaysTest() {
  console.log('================================================================');
  console.log('🧪 TESTES: MODO SOMENTE LEITURA (INADIMPLÊNCIA) & GATEWAYS');
  console.log('   Mercado Pago & InfinitePay — Restauração Automática');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. SETUP: Criar Loja de Teste com Assinatura Vencida
    // -------------------------------------------------------------
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 10); // 10 dias atrás

    // Inserir ou atualizar loja parceira de teste (ID 99)
    db.prepare('DELETE FROM subscription_payments WHERE company_id = 99').run();
    db.prepare('DELETE FROM users WHERE company_id = 99').run();
    db.prepare('DELETE FROM companies WHERE id = 99').run();

    db.prepare(`
      INSERT INTO companies (
        id, company_code, name, trade_name, cnpj, phone, email,
        plan_id, plan_name, subscription_status, access_expires_at, trial_ends_at
      ) VALUES (
        99, 'testoverdue', 'Oficina do João LTDA', 'Oficina João', '11.222.333/0001-44', '(11) 98888-0000', 'joao@oficinajoao.com.br',
        2, 'Prata', 'overdue', ?, ?
      )
    `).run(expiredDate.toISOString(), expiredDate.toISOString());

    const pwdHash = bcrypt.hashSync('senha123', 10);
    db.prepare(`
      INSERT INTO users (id, company_id, name, email, password_hash, role, active)
      VALUES (999, 99, 'João Técnico', 'joao@oficinajoao.com.br', ?, 'admin', 1)
    `).run(pwdHash);

    // Gerar token JWT para o usuário da loja vencida
    const overdueToken = jwt.sign(
      { id: 999, name: 'João Técnico', email: 'joao@oficinajoao.com.br', role: 'admin', company_id: 99 },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${overdueToken}`
    };

    console.log('--- 1. CONSULTAS EM MODO SOMENTE LEITURA (PERMITIDAS: GET) ---');

    // 1.1 Consulta de clientes permitida
    const getCustRes = await fetch(`${BASE_URL}/customers`, { headers });
    assert(getCustRes.status === 200, '1.1. Loja com pagamento atrasado acessa e consulta Clientes (GET)');

    // 1.2 Consulta de produtos permitida
    const getProdRes = await fetch(`${BASE_URL}/products`, { headers });
    assert(getProdRes.status === 200, '1.2. Loja com pagamento atrasado acessa e consulta Estoque/Produtos (GET)');

    // 1.3 Consulta de Ordens de Serviço permitida
    const getOsRes = await fetch(`${BASE_URL}/os`, { headers });
    assert(getOsRes.status === 200, '1.3. Loja com pagamento atrasado acessa e consulta Ordens de Serviço (GET)');

    // 1.4 Consulta de status da assinatura informa vencimento
    const getSubRes = await fetch(`${BASE_URL}/subscription/current`, { headers });
    const subData = await getSubRes.json();
    assert(getSubRes.status === 200 && subData.is_expired === true, '1.4. GET /api/subscription/current acusa is_expired: true');

    console.log('\n--- 2. BLOQUEIO DE CRIAÇÃO, EDIÇÃO E INSERÇÃO (403 SUBSCRIPTION_OVERDUE) ---');

    // 2.1 Tentativa de criar cliente -> BLOQUEADO
    const postCustRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Cliente Bloqueado', phone: '(11) 90000-0000' })
    });
    const postCustData = await postCustRes.json();
    assert(postCustRes.status === 403 && postCustData.code === 'SUBSCRIPTION_OVERDUE', '2.1. POST /api/customers bloqueado com 403 SUBSCRIPTION_OVERDUE');

    // 2.2 Tentativa de cadastrar produto -> BLOQUEADO
    const postProdRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Tela iPhone Teste', sale_price: 250, stock_quantity: 5 })
    });
    const postProdData = await postProdRes.json();
    assert(postProdRes.status === 403 && postProdData.code === 'SUBSCRIPTION_OVERDUE', '2.2. POST /api/products bloqueado com 403 SUBSCRIPTION_OVERDUE');

    // 2.3 Tentativa de abrir nova Ordem de Serviço -> BLOQUEADO
    const postOsRes = await fetch(`${BASE_URL}/os/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ customer_name: 'Teste Bloqueio OS', device_brand: 'Apple', device_model: 'iPhone 13' })
    });
    const postOsData = await postOsRes.json();
    assert(postOsRes.status === 403 && postOsData.code === 'SUBSCRIPTION_OVERDUE', '2.3. POST /api/os/create bloqueado com 403 SUBSCRIPTION_OVERDUE');

    // 2.4 Tentativa de abertura de caixa -> BLOQUEADO
    const postCashRes = await fetch(`${BASE_URL}/cash/open`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ opening_balance: 100 })
    });
    const postCashData = await postCashRes.json();
    assert(postCashRes.status === 403 && postCashData.code === 'SUBSCRIPTION_OVERDUE', '2.4. POST /api/cash/open bloqueado com 403 SUBSCRIPTION_OVERDUE');

    console.log('\n--- 3. CHECKOUT & INTEGRAÇÃO MERCADO PAGO ---');

    // Configurar gateway Mercado Pago na plataforma
    db.prepare(`
      UPDATE platform_settings
      SET active_gateway = 'mercadopago',
          mercadopago_token = 'APP_USR-test-token-12345',
          mercadopago_public_key = 'APP_USR-test-public-key-67890'
      WHERE id = 1
    `).run();

    // 3.1 Loja atrasada tem permissão de gerar checkout para regularizar
    const checkoutRes = await fetch(`${BASE_URL}/subscription/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plan_id: 3, billing_cycle: 'monthly', payment_method: 'PIX' }) // Plano Ouro
    });
    assert(checkoutRes.status === 201, '3.1. POST /api/subscription/checkout permitido mesmo em atraso para regularização');
    const checkoutData = await checkoutRes.json();
    assert(checkoutData.payment_id > 0, `3.2. Fatura #${checkoutData.payment_id} gerada`);
    assert(checkoutData.payment_gateway === 'mercadopago', '3.3. Fatura vinculada ao gateway Mercado Pago');

    // 3.2 Verificar status pendente em tempo real
    const checkPendingRes = await fetch(`${BASE_URL}/subscription/check-payment/${checkoutData.payment_id}`, { headers });
    const checkPendingData = await checkPendingRes.json();
    assert(checkPendingData.status === 'pending' && checkPendingData.activated === false, '3.4. GET /api/subscription/check-payment/:id retorna pending antes de pagar');

    // 3.3 Simular Webhook do Mercado Pago recebendo notificação de pagamento aprovado
    const webhookMpRes = await fetch(`${BASE_URL}/saas/webhook/mercadopago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'payment.updated',
        data: { id: checkoutData.gateway_payment_id || checkoutData.payment_id }
      })
    });
    assert(webhookMpRes.ok, '3.5. Webhook Mercado Pago processado com sucesso');

    // 3.4 Verificar se a loja foi reativada e acesso restaurado
    const checkActiveRes = await fetch(`${BASE_URL}/subscription/check-payment/${checkoutData.payment_id}`, { headers });
    const checkActiveData = await checkActiveRes.json();
    assert(checkActiveData.status === 'paid' && checkActiveData.activated === true, '3.6. Check-Payment valida status pago e reativação');

    // 3.5 Verificar dados da empresa no banco
    const updatedComp = db.prepare('SELECT subscription_status, access_expires_at, plan_name FROM companies WHERE id = 99').get() as any;
    assert(updatedComp.subscription_status === 'active', '3.7. Status da loja restaurado para "active"');
    assert(new Date(updatedComp.access_expires_at) > new Date(), '3.8. Validade de acesso estendida para o futuro');
    assert(updatedComp.plan_name === 'Ouro', '3.9. Plano atualizado para Ouro conforme contratado');

    // 3.6 Agora que está ativo, testar escrita novamente (RESTABELECIMENTO TOTAL DO ACESSO)
    const postCustAfterRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Cliente Liberado Pós-Pagamento', phone: '(11) 97777-1111' })
    });
    assert(postCustAfterRes.status === 201, '3.10. Restauração Completa: POST /api/customers autorizado com sucesso pós-pagamento');

    console.log('\n--- 4. INTEGRAÇÃO INFINITEPAY (CLOUDWALK) ---');

    // Re-expirar a loja para testar InfinitePay
    db.prepare("UPDATE companies SET subscription_status = 'overdue', access_expires_at = ? WHERE id = 99").run(expiredDate.toISOString());

    // Configurar gateway InfinitePay
    db.prepare(`
      UPDATE platform_settings
      SET active_gateway = 'infinitepay',
          infinitepay_api_key = 'inf_sec_test_api_key_888',
          infinitepay_handle = '$oficinajoao',
          infinitepay_environment = 'production'
      WHERE id = 1
    `).run();

    // 4.1 Gerar checkout InfinitePay
    const checkoutIpRes = await fetch(`${BASE_URL}/subscription/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plan_id: 2, billing_cycle: 'monthly', payment_method: 'PIX' }) // Plano Prata
    });
    assert(checkoutIpRes.status === 201, '4.1. Checkout gerado com InfinitePay');
    const checkoutIpData = await checkoutIpRes.json();
    assert(checkoutIpData.payment_gateway === 'infinitepay', '4.2. Fatura vinculada ao gateway InfinitePay');

    // 4.2 Simular Webhook da InfinitePay
    const webhookIpRes = await fetch(`${BASE_URL}/saas/webhook/infinitepay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'transaction.success',
        data: {
          transaction_id: checkoutIpData.gateway_payment_id || checkoutIpData.payment_id,
          status: 'paid'
        }
      })
    });
    assert(webhookIpRes.ok, '4.3. Webhook InfinitePay processado com sucesso');

    // 4.3 Verificar liberação pós-InfinitePay
    const compAfterIp = db.prepare('SELECT subscription_status, access_expires_at FROM companies WHERE id = 99').get() as any;
    assert(compAfterIp.subscription_status === 'active' && new Date(compAfterIp.access_expires_at) > new Date(), '4.4. Acesso da loja normalizado automaticamente via InfinitePay');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    db.prepare('DELETE FROM subscription_payments WHERE company_id = 99').run();
    db.prepare('DELETE FROM users WHERE company_id = 99').run();
    db.prepare('DELETE FROM companies WHERE id = 99').run();

    // Restaurar platform_settings padrão
    db.prepare("UPDATE platform_settings SET active_gateway = 'manual_pix' WHERE id = 1").run();

  } catch (err: any) {
    console.error('Erro ao executar testes:', err);
    assert(false, `Exceção: ${err.message}`);
  }

  console.log(`\n================================================================`);
  console.log(`📊 RESULTADO DOS TESTES DE READ-ONLY & GATEWAYS:`);
  console.log(`   TOTAL PASS: ${passed} | TOTAL FAIL: ${failed}`);
  console.log(`================================================================`);
}

runReadOnlyAndGatewaysTest();
