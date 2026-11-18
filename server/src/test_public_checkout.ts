import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log('🧪 Iniciando teste dos endpoints públicos de checkout e compra...');

  // 1. Planos públicos
  const plansRes = await fetch(`${BASE_URL}/subscription/public-plans`);
  assert(plansRes.ok, '1. public-plans respondeu 200');
  const plans = await plansRes.json();
  assert(Array.isArray(plans) && plans.length === 2, '2. Retornou exatamente 2 planos (Prata e Ouro)');
  console.log('✅ 1. Planos públicos retornados com sucesso:', plans.map((p: any) => p.name));

  // 2. Checkout público (Cadastro de nova loja + geração de fatura PIX)
  const testEmail = `loja_${Date.now()}@teste.com`;
  const checkoutPayload = {
    company_name: 'Smart Cell Assistência Técnica',
    trade_name: 'Smart Cell',
    cnpj_cpf: '12.345.678/0001-99',
    phone: '(11) 99999-8888',
    admin_name: 'Marcos Vinicius',
    admin_email: testEmail,
    admin_password: 'senhaSegura123',
    plan_id: 2, // Plano Ouro
    billing_cycle: 'monthly',
    payment_method: 'PIX'
  };

  const checkoutRes = await fetch(`${BASE_URL}/subscription/public-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutPayload)
  });

  assert(checkoutRes.status === 201, `3. public-checkout retornou 201 (Recebido: ${checkoutRes.status})`);
  const checkoutData = await checkoutRes.json();
  assert(checkoutData.payment_id, '4. Retornou payment_id');
  assert(checkoutData.pix_copia_cola, '5. Retornou código copia-e-cola PIX');
  assert(checkoutData.company_id, '6. Criou e retornou company_id');
  console.log('✅ 2. Nova loja cadastrada com fatura PIX:', {
    payment_id: checkoutData.payment_id,
    amount: checkoutData.amount,
    plan: checkoutData.plan_name
  });

  // 3. Consulta de status (inicialmente pending)
  const checkPendingRes = await fetch(`${BASE_URL}/subscription/public-check-payment/${checkoutData.payment_id}`);
  assert(checkPendingRes.ok, '7. public-check-payment respondeu 200');
  const pendingData = await checkPendingRes.json();
  assert(pendingData.status === 'pending' && pendingData.activated === false, '8. Status inicial é pending');
  console.log('✅ 3. Status de pagamento pendente validado');

  // 4. Confirmação do pagamento (Simulação / Webhook)
  const confirmRes = await fetch(`${BASE_URL}/subscription/public-confirm-payment/${checkoutData.payment_id}`, {
    method: 'POST'
  });
  assert(confirmRes.ok, '9. public-confirm-payment respondeu 200');
  const confirmData = await confirmRes.json();
  assert(confirmData.status === 'paid' && confirmData.activated === true, '10. Status aprovado e loja ativada');
  assert(confirmData.email_sent === true, '11. Confirmação de envio de e-mail registrada');
  assert(confirmData.token, '12. Token JWT gerado para login automático imediato');
  console.log('✅ 4. Pagamento aprovado, e-mail registrado e token JWT emitido com sucesso!');

  // 5. Testar login com o novo usuário criado
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'senhaSegura123' })
  });
  assert(loginRes.ok, '13. Usuário recém-cadastrado consegue logar com suas credenciais');
  console.log('✅ 5. Login do novo cliente validado com sucesso!');

  console.log('🎉 TODOS OS TESTES DE COMPRA PÚBLICA PASSARAM COM 100% DE SUCESSO!');
}

run().catch((e) => {
  console.error('❌ Erro no teste:', e);
  process.exit(1);
});
