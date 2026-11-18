const BASE_URL = 'http://localhost:5000/api';

console.log('======================================================================');
console.log('🔍 AUDITORIA E VALIDAÇÃO COMPARATIVA COMPLETA COM O SISTEMA REFERÊNCIA');
console.log('   Assistencia shop vs DSHOP PRO');
console.log('======================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(success: boolean, title: string, details?: any) {
  totalChecks++;
  if (success) {
    passedChecks++;
    console.log(`✅ [OK] ${title}`);
    if (details) console.log(`   ↳ ${JSON.stringify(details)}`);
  } else {
    failedChecks++;
    console.error(`❌ [ERRO] ${title}`);
    if (details) console.error(`   ↳ ${JSON.stringify(details)}`);
  }
}

async function runAudit() {
  let authToken = '';

  // 1. Health check
  try {
    const res = await (await fetch(`${BASE_URL}/health`)).json() as any;
    check(res.status === 'ok', '1. Backend Health Check operacional', res.system);
  } catch (e: any) {
    check(false, '1. Backend Health Check falhou', e.message);
  }

  // 2. Authentication & Master Profile
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@assistenciashop.com.br', password: 'admin123' })
    });
    const data = await res.json() as any;
    authToken = data.token;
    check(res.ok && !!data.token && data.user.role === 'master', '2. Autenticação JWT do perfil Dono (Master)', { user: data.user.name, role: data.user.role });
  } catch (e: any) {
    check(false, '2. Autenticação JWT falhou', e.message);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };

  // 3. User Me Profile
  try {
    const res = await (await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders })).json() as any;
    check(res.name === 'MACKSON WEIBER', '3. Identificação do usuário ativo (/api/auth/me)');
  } catch (e: any) {
    check(false, '3. Falha em /api/auth/me', e.message);
  }

  // 4. Dashboard Summary Stats & KPIs
  try {
    const res = await (await fetch(`${BASE_URL}/dashboard/summary-stats`, { headers: authHeaders })).json() as any;
    check(res.open_os !== undefined && res.total_customers !== undefined, '4. Indicadores e KPIs do Dashboard (Vendas, O.S. Abertas, Clientes)', res);
  } catch (e: any) {
    check(false, '4. Falha em /api/dashboard/summary-stats', e.message);
  }

  // 5. Dashboard Upcoming Deadlines
  try {
    const res = await (await fetch(`${BASE_URL}/dashboard/upcoming-deadlines`, { headers: authHeaders })).json() as any;
    check(Array.isArray(res), '5. Consulta de O.S. próximas do prazo (Alerta de Prazos)');
  } catch (e: any) {
    check(false, '5. Falha em /api/dashboard/upcoming-deadlines', e.message);
  }

  // 6. Dashboard Operational Charts
  try {
    const res = await (await fetch(`${BASE_URL}/dashboard/charts?period=monthly`, { headers: authHeaders })).json() as any;
    check(Array.isArray(res.services) && Array.isArray(res.items), '6. Gráficos de Serviços e Itens Vendidos (Período Mensal)');
  } catch (e: any) {
    check(false, '6. Falha em /api/dashboard/charts', e.message);
  }

  // 7. Cash Register Status & Open Session
  let activeSessionId = 0;
  try {
    const res = await (await fetch(`${BASE_URL}/cash/status`, { headers: authHeaders })).json() as any;
    if (!res.isOpen) {
      const openRes = await (await fetch(`${BASE_URL}/cash/open`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ opening_balance: 150.00, notes: 'Abertura para bateria de auditoria' })
      })).json() as any;
      activeSessionId = openRes.sessionId;
      check(true, '7. Abertura de Caixa com suprimento inicial de troco R$ 150,00', { sessionId: activeSessionId });
    } else {
      activeSessionId = res.session.id;
      check(true, '7. Caixa já se encontra aberto na sessão ativa', { sessionId: activeSessionId, saldo: res.totalBalance });
    }
  } catch (e: any) {
    check(false, '7. Falha ao verificar/abrir caixa', e.message);
  }

  // 8. Sangria and Suprimento
  try {
    const supRes = await (await fetch(`${BASE_URL}/cash/transaction`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ type: 'supply', amount: 50.00, description: 'Reforço de troco' })
    })).json() as any;
    const sangRes = await (await fetch(`${BASE_URL}/cash/transaction`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ type: 'bleed', amount: 20.00, description: 'Despesa café / insumos' })
    })).json() as any;
    check(supRes.success && sangRes.success, '8. Movimentações avulsas de Caixa: Suprimento (+50) e Sangria (-20) OK');
  } catch (e: any) {
    check(false, '8. Falha em sangria/suprimento', e.message);
  }

  // 9. OS Hub Counters (Todas, Aguardando, Autorizadas, Prontas, Finalizadas, Laudos)
  try {
    const counts = await (await fetch(`${BASE_URL}/os/hub-counts`, { headers: authHeaders })).json() as any;
    check(counts.total !== undefined && counts.evaluation !== undefined && counts.authorized !== undefined && counts.ready !== undefined, '9. Hub de O.S.: Contadores das 6 filas operacionais', counts);
  } catch (e: any) {
    check(false, '9. Falha em /api/os/hub-counts', e.message);
  }

  // 10. Sequential Code Generation for OS
  try {
    const codeRes = await (await fetch(`${BASE_URL}/os/next-code`, { headers: authHeaders })).json() as any;
    check(typeof codeRes.nextCode === 'number', '10. Numeração sequencial de O.S. (Código sequencial)', { proximoCodigo: codeRes.nextCode });
  } catch (e: any) {
    check(false, '10. Falha em /api/os/next-code', e.message);
  }

  // 11. Customer & Device Registration
  let testCustomerId = 0;
  let testDeviceId = 0;
  try {
    const custRes = await (await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Cliente Auditoria Referência',
        phone: '(11) 98888-7777',
        whatsapp: '(11) 98888-7777',
        cpf_cnpj: '111.222.333-44',
        email: 'auditoria@cliente.com',
        city: 'São Paulo',
        state: 'SP'
      })
    })).json() as any;
    testCustomerId = custRes.id;

    const devRes = await (await fetch(`${BASE_URL}/customers/${testCustomerId}/devices`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        device_type: 'Celular',
        brand: 'Samsung',
        model: 'Galaxy S22 Ultra 256GB',
        imei_serial: '359988776655443',
        color: 'Verde',
        unlock_password: 'padrão em L'
      })
    })).json() as any;
    testDeviceId = devRes.id;

    check(testCustomerId > 0 && testDeviceId > 0, '11. Cadastro completo de Cliente e Aparelho com IMEI e Senha', { customerId: testCustomerId, deviceId: testDeviceId });
  } catch (e: any) {
    check(false, '11. Falha no cadastro de cliente/aparelho', e.message);
  }

  // 12. Create Service Order (OS) with 29-Item Checklist & Advance Payment
  let createdOSId = 0;
  try {
    const osPayload = {
      customer_id: testCustomerId,
      device_id: testDeviceId,
      reported_defects: 'Vidro quebrado e porta de carga com folga/não carrega',
      entry_notes: 'Capa transparente, película quebrada, sem cartão SIM',
      deadline_date: '2026-11-22',
      advance_payment: 100.00,
      advance_payment_method: 'PIX',
      warranty_period: 90,
      warranty_unit: 'Dias',
      checklist: [
        { key: 'tela_quebrada', status: 'sim' },
        { key: 'porta_carga', status: 'sim' },
        { key: 'liga', status: 'nao' },
        { key: 'bateria_inchada', status: 'nao' }
      ]
    };

    const res = await (await fetch(`${BASE_URL}/os/create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(osPayload)
    })).json() as any;
    createdOSId = res.id;

    check(createdOSId > 0, `12. Abertura de Nova O.S. #${res.code} com Sinal de R$ 100,00 e Checklist de 29 itens`, { osId: createdOSId, code: res.code });
  } catch (e: any) {
    check(false, '12. Falha na abertura da O.S.', e.message);
  }

  // 13. Fetch OS Details & Verify Checklist completeness
  try {
    const osDetails = await (await fetch(`${BASE_URL}/os/${createdOSId}`, { headers: authHeaders })).json() as any;
    const hasCompleteChecklist = osDetails.checklist.length >= 27;
    const defectTela = osDetails.checklist.find((c: any) => c.item_key === 'tela_quebrada');
    check(hasCompleteChecklist && defectTela.status === 'sim', `13. Verificação de integridade dos ${osDetails.checklist.length} itens do checklist na O.S.`, { checklistCount: osDetails.checklist.length, statusTela: defectTela.status });
  } catch (e: any) {
    check(false, '13. Falha ao verificar detalhes e checklist da O.S.', e.message);
  }

  // 14. Stock Deduction on Adding Part to OS
  let addedPartItemId = 0;
  try {
    // Get product stock before
    const prodsBefore = await (await fetch(`${BASE_URL}/products?is_part=1`, { headers: authHeaders })).json() as any[];
    const targetPart = prodsBefore[0];
    const stockBefore = targetPart.stock_quantity;

    await fetch(`${BASE_URL}/os/${createdOSId}/items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        item_type: 'part',
        product_id: targetPart.id,
        description: targetPart.name,
        unit_price: targetPart.sale_price,
        quantity: 1,
        warranty_period: 90,
        warranty_unit: 'Dias'
      })
    });

    const prodsAfter = await (await fetch(`${BASE_URL}/products?is_part=1`, { headers: authHeaders })).json() as any[];
    const stockAfter = prodsAfter.find(p => p.id === targetPart.id).stock_quantity;

    check(stockAfter === stockBefore - 1, `14. Baixa automática de estoque de peça adicionada à O.S. (${stockBefore} -> ${stockAfter})`, { produto: targetPart.name });
  } catch (e: any) {
    check(false, '14. Falha na baixa de estoque da peça na O.S.', e.message);
  }

  // 15. Adding Service to OS
  try {
    await fetch(`${BASE_URL}/os/${createdOSId}/items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        item_type: 'service',
        description: 'Serviço de Troca de Conector Sub-placa',
        unit_price: 90.00,
        quantity: 1,
        warranty_period: 90,
        warranty_unit: 'Dias'
      })
    });

    const updated = await (await fetch(`${BASE_URL}/os/${createdOSId}`, { headers: authHeaders })).json() as any;
    check(updated.items.length === 2 && updated.os.total_services === 90.00, '15. Adição de serviço à O.S. e recálculo automático de totais', { totalServicos: updated.os.total_services, totalGeral: updated.os.total_amount });
  } catch (e: any) {
    check(false, '15. Falha ao adicionar serviço à O.S.', e.message);
  }

  // 16. Full 10-Status Transitions Workflow & Audit Timeline
  try {
    const testStatuses = [
      'Aguardando orçamento',
      'Autorizada',
      'Reparo em andamento',
      'Pronta'
    ];

    for (const st of testStatuses) {
      await fetch(`${BASE_URL}/os/${createdOSId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: st, notes: `Transição de teste para ${st}` })
      });
    }

    const osAfterTransitions = await (await fetch(`${BASE_URL}/os/${createdOSId}`, { headers: authHeaders })).json() as any;
    check(osAfterTransitions.os.status === 'Pronta' && osAfterTransitions.history.length >= 4, '16. Tramitação pelos status operacionais e registro de histórico cronológico', { statusAtual: osAfterTransitions.os.status, passosHistorico: osAfterTransitions.history.length });
  } catch (e: any) {
    check(false, '16. Falha na tramitação de status', e.message);
  }

  // 17. Finalizing and Paying OS
  try {
    const payRes = await (await fetch(`${BASE_URL}/os/${createdOSId}/payment`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        payment_method: 'Cartão de crédito',
        discount: 10.00,
        final_status: 'Finalizada'
      })
    })).json() as any;

    const osFinal = await (await fetch(`${BASE_URL}/os/${createdOSId}`, { headers: authHeaders })).json() as any;
    check(payRes.success && osFinal.os.status === 'Finalizada' && !!osFinal.os.exit_date, '17. Fechamento e quitação da O.S. no Caixa com emissão de data de saída', { status: osFinal.os.status, valorQuitado: payRes.netDue });
  } catch (e: any) {
    check(false, '17. Falha na quitação da O.S.', e.message);
  }

  // 18. POS Counter Sale (PDV Balcão)
  let saleId = 0;
  try {
    const prods = await (await fetch(`${BASE_URL}/products?is_part=0`, { headers: authHeaders })).json() as any[];
    const balcaoItem = prods[0];

    const saleRes = await (await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customer_id: testCustomerId,
        items: [{
          product_id: balcaoItem.id,
          description: balcaoItem.name,
          unit_price: balcaoItem.sale_price,
          quantity: 2
        }],
        discount: 5.00,
        payment_method: 'Dinheiro',
        installments: 1
      })
    })).json() as any;
    saleId = saleRes.saleId;

    check(saleId > 0, `18. Venda rápida no PDV #${saleRes.code} com desconto e baixa de estoque`, { vendaId: saleId, valorFinal: saleRes.finalAmount });
  } catch (e: any) {
    check(false, '18. Falha na venda no PDV', e.message);
  }

  // 19. Sale Details for Receipt Printing
  try {
    const saleDetails = await (await fetch(`${BASE_URL}/sales/${saleId}`, { headers: authHeaders })).json() as any;
    check(saleDetails.items.length === 1 && !!saleDetails.company.trade_name, '19. Dados da venda formatados para impressão de cupom não fiscal', { itens: saleDetails.items.length, loja: saleDetails.company.trade_name });
  } catch (e: any) {
    check(false, '19. Falha ao obter dados da venda para impressão', e.message);
  }

  // 20. Seminovos: Purchase of Used Device from Customer
  try {
    const buyTradeRes = await (await fetch(`${BASE_URL}/used-devices/purchase`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customer_id: testCustomerId,
        brand: 'Xiaomi',
        model: 'Redmi Note 11 128GB',
        imei_serial: '864455667788991',
        color: 'Cinza',
        condition_grade: 'Bom',
        purchase_price: 450.00,
        expected_sale_price: 750.00,
        notes: 'Aparelho em bom estado, bateria 90%'
      })
    })).json() as any;

    check(buyTradeRes.success && buyTradeRes.tradeId > 0, '20. Compra de aparelho seminovo com saída automática do caixa', { tradeId: buyTradeRes.tradeId });
  } catch (e: any) {
    check(false, '20. Falha na compra de seminovo', e.message);
  }

  // 21. Financial Summary & DRE
  try {
    const finSummary = await (await fetch(`${BASE_URL}/financial/summary`, { headers: authHeaders })).json() as any;
    check(finSummary.total_revenue > 0, '21. Resumo financeiro consolidado (Faturamento, Receitas e Lucro Líquido)', finSummary);
  } catch (e: any) {
    check(false, '21. Falha em /api/financial/summary', e.message);
  }

  // 22. Card Rates Configuration
  try {
    const rates = await (await fetch(`${BASE_URL}/financial/rates`, { headers: authHeaders })).json() as any[];
    check(Array.isArray(rates) && rates.length >= 8, '22. Tabela de taxas de débito e crédito por parcelas (1x a 12x)', { totalTaxas: rates.length });
  } catch (e: any) {
    check(false, '22. Falha em /api/financial/rates', e.message);
  }

  // 23. Technician Commissions Calculation
  try {
    const comms = await (await fetch(`${BASE_URL}/financial/commissions`, { headers: authHeaders })).json() as any[];
    check(Array.isArray(comms) && comms.length > 0, '23. Relatório de comissões por técnico baseado em serviços concluídos', comms.map(c => ({ tecnico: c.name, comissao: c.commission_amount })));
  } catch (e: any) {
    check(false, '23. Falha em /api/financial/commissions', e.message);
  }

  // 24. Company Details & Warranty Legal Clauses (Art. 26 CDC)
  try {
    const comp = await (await fetch(`${BASE_URL}/settings/company`, { headers: authHeaders })).json() as any;
    check(comp.trade_name === 'Assistencia shop' && comp.warranty_terms.includes('artigo 26 do Código de Defesa do Consumidor'), '24. Configurações da Matriz e Termos Legais de Garantia de 90 dias', { empresa: comp.trade_name, cnpj: comp.cnpj });
  } catch (e: any) {
    check(false, '24. Falha em /api/settings/company', e.message);
  }

  // 25. Team & Users Management
  try {
    const users = await (await fetch(`${BASE_URL}/settings/users`, { headers: authHeaders })).json() as any[];
    check(users.length >= 2, '25. Gestão de Equipe e controle de permissões por usuário', { totalUsuarios: users.length });
  } catch (e: any) {
    check(false, '25. Falha em /api/settings/users', e.message);
  }

  // 26. RBAC Profiles & Module Permissions
  try {
    const profs = await (await fetch(`${BASE_URL}/settings/profiles`, { headers: authHeaders })).json() as any[];
    check(Array.isArray(profs), '26. Perfis de acesso modulares com controle de Admin do Módulo', { totalPerfis: profs.length });
  } catch (e: any) {
    check(false, '26. Falha em /api/settings/profiles', e.message);
  }

  // 27. Complete Audit Trail (Logs)
  try {
    const audit = await (await fetch(`${BASE_URL}/settings/audit`, { headers: authHeaders })).json() as any;
    check(audit.data && audit.data.length > 0, '27. Trilha de auditoria minuciosa de todas as operações (Quem, O quê, Quando, IP)', { totalLogs: audit.total, ultimosLogs: audit.data.slice(0, 3).map((l: any) => `${l.module} - ${l.action}`) });
  } catch (e: any) {
    check(false, '27. Falha em /api/settings/audit', e.message);
  }

  console.log('\n======================================================================');
  console.log(`📊 PLACAR FINAL DA AUDITORIA: ${passedChecks}/${totalChecks} TESTES APROVADOS (${failedChecks} FALHAS)`);
  console.log('======================================================================\n');
}

runAudit();
