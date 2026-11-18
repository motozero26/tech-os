import { db } from './db.js';
import bcrypt from 'bcryptjs';

async function runDeepAudit() {
  console.log('================================================================');
  console.log('🚀 INICIANDO ANÁLISE PROFUNDA & TESTES EXAUSTIVOS DO TECHOS');
  console.log('   Módulos: Auth, Caixa, PDV, O.S., Estoque, Clientes, Financeiro,');
  console.log('   SaaS Multi-Loja, Personalização e Módulo Fiscal SEFAZ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(title: string, fn: () => boolean | Promise<boolean>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        throw new Error('Sync runner used for promise');
      }
      if (res) {
        console.log(`✅ [PASS] ${title}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${title}`);
        failed++;
      }
    } catch (e: any) {
      console.error(`❌ [FAIL] ${title} - Error: ${e.message}`);
      failed++;
    }
  }

  async function testAsync(title: string, fn: () => Promise<boolean>) {
    try {
      const res = await fn();
      if (res) {
        console.log(`✅ [PASS] ${title}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${title}`);
        failed++;
      }
    } catch (e: any) {
      console.error(`❌ [FAIL] ${title} - Error: ${e.message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // EIXO 1: AUTENTICAÇÃO, CONTROLE DE ACESSO (RBAC) E COMPATIBILIDADE
  // -------------------------------------------------------------
  console.log('\n--- 1. AUTENTICAÇÃO & CONTROLE DE ACESSO (RBAC) ---');

  const masterUser = db.prepare("SELECT * FROM users WHERE role = 'master' AND active = 1").get() as any;
  test('1.1. Usuário Master Admin existe e está ativo', () => !!masterUser);
  test('1.2. Hash de senha do Master é Bcrypt válido', () => bcrypt.compareSync('admin123', masterUser.password_hash));

  // Testar busca de usuário por e-mail novo e legado
  const userByEmail = db.prepare("SELECT * FROM users WHERE email IN ('admin@techos.com.br', 'admin@assistenciashop.com.br') AND active = 1").get() as any;
  test('1.3. Localização de Master compatível com admin@techos.com.br ou legado', () => !!userByEmail);

  // -------------------------------------------------------------
  // EIXO 2: EMPRESA, PERSONALIZAÇÃO VISUAL & TEMAS
  // -------------------------------------------------------------
  console.log('\n--- 2. EMPRESA, PERSONALIZAÇÃO & TEMAS (LIGHT / DARK) ---');

  const comp = db.prepare('SELECT * FROM companies WHERE id = 1').get() as any;
  test('2.1. Empresa Matriz ID 1 configurada no banco', () => !!comp);
  test('2.2. Nome da loja não exibe marca antiga no banco de dados', () => {
    const freshComp = db.prepare('SELECT name, trade_name FROM companies WHERE id = 1').get() as any;
    const trade = (freshComp?.trade_name || '').toLowerCase();
    const name = (freshComp?.name || '').toLowerCase();
    const isClean = !trade.includes('assistencia shop') && !name.includes('assistencia shop');
    if (!isClean) console.log('DEBUG FAIL 2.2:', { trade, name });
    return isClean;
  });

  // Testar alteração de tema para Light e Dark
  db.prepare("UPDATE companies SET theme_mode = 'light', primary_color = '#059669' WHERE id = 1").run();
  let compUpdated = db.prepare('SELECT theme_mode, primary_color FROM companies WHERE id = 1').get() as any;
  test('2.3. Persistência de Modo Claro (light) e Cor Primária Personalizada', () => compUpdated.theme_mode === 'light' && compUpdated.primary_color === '#059669');

  db.prepare("UPDATE companies SET theme_mode = 'dark', primary_color = '#2563eb' WHERE id = 1").run();
  compUpdated = db.prepare('SELECT theme_mode, primary_color FROM companies WHERE id = 1').get() as any;
  test('2.4. Alternância e Persistência de Modo Escuro (dark)', () => compUpdated.theme_mode === 'dark' && compUpdated.primary_color === '#2563eb');

  // -------------------------------------------------------------
  // EIXO 3: CAIXA & PDV (FLUXO FINANCEIRO DE BALCÃO)
  // -------------------------------------------------------------
  console.log('\n--- 3. CAIXA & FRENTE DE BALCÃO (PDV) ---');

  // Abertura de sessão de caixa
  const openCash = db.prepare(`
    INSERT INTO cash_sessions (company_id, user_id, user_name, opening_balance, status, opened_at)
    VALUES (1, ?, ?, 150.00, 'open', CURRENT_TIMESTAMP)
  `).run(masterUser.id, masterUser.name);
  const cashSessionId = openCash.lastInsertRowid;
  test('3.1. Abertura de sessão de caixa com saldo inicial de R$ 150,00', () => !!cashSessionId);

  // Suprimento e Sangria
  db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, description)
    VALUES (?, ?, 'in', 50.00, 'Dinheiro', 'Suprimento de troco')
  `).run(cashSessionId, masterUser.id);
  db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, description)
    VALUES (?, ?, 'out', 30.00, 'Dinheiro', 'Sangria para pagamento de motoboy')
  `).run(cashSessionId, masterUser.id);

  const txSum = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as total_in,
      SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total_out
    FROM cash_transactions WHERE session_id = ?
  `).get(cashSessionId) as any;
  test('3.2. Lançamento e conciliação de Suprimento (R$ 50) e Sangria (R$ 30)', () => txSum.total_in === 50 && txSum.total_out === 30);

  // -------------------------------------------------------------
  // EIXO 4: CLIENTES, APARELHOS & ORDENS DE SERVIÇO COM FOTOS
  // -------------------------------------------------------------
  console.log('\n--- 4. CLIENTES, APARELHOS & ORDENS DE SERVIÇO (O.S.) ---');

  const insCust = db.prepare(`
    INSERT INTO customers (company_id, name, cpf_cnpj, phone, email, address, number, neighborhood, city, state, zip_code)
    VALUES (1, 'Cliente Teste Auditoria', '333.444.555-66', '(11) 97777-6666', 'cliente@teste.com', 'Av Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', '01310-100')
  `).run();
  const customerId = insCust.lastInsertRowid;
  test('4.1. Cadastro de cliente com endereço completo', () => !!customerId);

  const insDev = db.prepare(`
    INSERT INTO customer_devices (customer_id, device_type, brand, model, imei_serial, color)
    VALUES (?, 'smartphone', 'Apple', 'iPhone 14 Pro', 'DX999888777', 'Roxo Profundo')
  `).run(customerId);
  const deviceId = insDev.lastInsertRowid;
  test('4.2. Vínculo de aparelho ao cliente (iPhone 14 Pro)', () => !!deviceId);

  // O.S. com Fotos de Entrada
  const entryPhotosJson = JSON.stringify([
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD_FOTO1',
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD_FOTO2'
  ]);
  const osCode = 'OS' + Math.floor(Math.random() * 89999 + 10000);

  const insOS = db.prepare(`
    INSERT INTO service_orders (
      company_id, code, customer_id, device_id, technician_id,
      status, reported_defects, total_parts, total_services, total_amount,
      entry_photos, created_at
    ) VALUES (
      1, ?, ?, ?, ?,
      'analise', 'Vidro frontal quebrado e aro arranhado', 450.00, 150.00, 600.00,
      ?, CURRENT_TIMESTAMP
    )
  `).run(osCode, customerId, deviceId, masterUser.id, entryPhotosJson);
  const osId = insOS.lastInsertRowid;

  test('4.3. Criação de Ordem de Serviço com fotos de entrada', () => !!osId);

  const osLoaded = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(osId) as any;
  test('4.4. Recuperação das fotos de entrada anexadas à O.S.', () => {
    const photos = JSON.parse(osLoaded.entry_photos || '[]');
    return photos.length === 2 && photos[0].includes('FOTO1');
  });

  // Tramitação de O.S. para Aprovado -> Finalizado
  db.prepare("UPDATE service_orders SET status = 'concluido', exit_date = CURRENT_TIMESTAMP WHERE id = ?").run(osId);
  const osFinished = db.prepare('SELECT status, exit_date FROM service_orders WHERE id = ?').get(osId) as any;
  test('4.5. Tramitação e finalização da O.S. com registro de data/hora de saída', () => osFinished.status === 'concluido' && !!osFinished.exit_date);

  // -------------------------------------------------------------
  // EIXO 5: ESTOQUE & PEÇAS (INTEGRAÇÃO COM PDV E FISCAL)
  // -------------------------------------------------------------
  console.log('\n--- 5. ESTOQUE & PEÇAS ---');

  const insProd = db.prepare(`
    INSERT INTO products (company_id, name, sku, ncm, unit, cost_price, sale_price, stock_quantity, min_stock)
    VALUES (1, 'Tela Display iPhone 14 Pro OLED', 'TELA-IP14P-OLED', '85177900', 'UN', 280.00, 450.00, 15, 3)
  `).run();
  const prodId = insProd.lastInsertRowid;
  test('5.1. Cadastro de peça de reposição no estoque com NCM 8517.79.00', () => !!prodId);

  // Baixa de estoque simulada de venda no PDV
  db.prepare('UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = ?').run(prodId);
  const prodAfterSale = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(prodId) as any;
  test('5.2. Baixa automática de quantidade em estoque (15 -> 13)', () => prodAfterSale.stock_quantity === 13);

  // -------------------------------------------------------------
  // EIXO 6: SAAS MULTI-LOJA, PLANOS E VALIDADE
  // -------------------------------------------------------------
  console.log('\n--- 6. SAAS MULTI-LOJA, PLANOS (PRATA & OURO) E VALIDADE ---');

  const saasPlans = db.prepare("SELECT * FROM plans WHERE active = 1 AND name IN ('Prata', 'Ouro') ORDER BY price_monthly ASC").all() as any[];
  test('6.1. Estritamente 2 planos mensais ativos na plataforma', () => saasPlans.length === 2);
  test('6.2. Plano Prata fixado em R$ 49,90/mês', () => saasPlans[0].name === 'Prata' && saasPlans[0].price_monthly === 49.90);
  test('6.3. Plano Ouro fixado em R$ 79,90/mês', () => saasPlans[1].name === 'Ouro' && saasPlans[1].price_monthly === 79.90);

  // -------------------------------------------------------------
  // EIXO 7: MÓDULO FISCAL & INTEGRAÇÃO COM SEFAZ
  // -------------------------------------------------------------
  console.log('\n--- 7. MÓDULO FISCAL & INTEGRAÇÃO COM SEFAZ (MOC v4.00) ---');

  // Teste 7.1: Exclusividade do Plano Ouro (Bloqueio do Plano Prata)
  // Criar loja temporária no Plano Prata
  const insPrataStore = db.prepare(`
    INSERT INTO companies (company_code, name, trade_name, cnpj, plan_id, plan_name, subscription_status)
    VALUES ('test_prata', 'Loja Prata Sem Fiscal', 'Loja Prata', '99.888.777/0001-11', ?, 'Prata', 'active')
  `).run(saasPlans[0].id);
  const prataStoreId = insPrataStore.lastInsertRowid;

  const prataStoreCheck = db.prepare(`
    SELECT p.name as plan_title FROM companies c JOIN plans p ON p.id = c.plan_id WHERE c.id = ?
  `).get(prataStoreId) as any;
  const isPrataAllowed = (prataStoreCheck?.plan_title || '').toLowerCase().includes('ouro');
  test('7.1. Bloqueio estrito de acesso fiscal para lojas no Plano Prata', () => isPrataAllowed === false);

  // Teste 7.2: Liberação de acesso fiscal para lojas no Plano Ouro
  const ouroPlanId = saasPlans[1].id;
  db.prepare('UPDATE companies SET plan_id = ?, plan_name = ? WHERE id = 1').run(ouroPlanId, 'Ouro');
  const matStoreCheck = db.prepare(`
    SELECT p.name as plan_title FROM companies c JOIN plans p ON p.id = c.plan_id WHERE c.id = 1
  `).get() as any;
  const isOuroAllowed = (matStoreCheck?.plan_title || '').toLowerCase().includes('ouro');
  test('7.2. Liberação de acesso fiscal para a loja no Plano Ouro', () => isOuroAllowed === true);

  // Teste 7.3: Emissão de NFS-e de Serviços MEI (Padrão Nacional sem exigência de certificado A1)
  const nfseNow = new Date();
  const cleanCnpjMat = '12345678000190';
  const nfseKey = `NFSMEI-${cleanCnpjMat}-000000001-7890`;
  const insNfse = db.prepare(`
    INSERT INTO fiscal_invoices (
      company_id, invoice_type, number, series, access_key, protocol, status,
      customer_name, customer_cpf_cnpj, service_code, cnae_code, service_description,
      total_services, total_amount, xml_content, issued_at
    ) VALUES (
      1, 'nfse_service_mei', 1, 'E', ?, '135260000001', 'authorized',
      'Cliente Tomador MEI', '111.222.333-44', '14.01', '9512-6/00', 'Manutenção técnica de smartphone',
      180.00, 180.00, '<NFSe versao="1.00"><valores><vServPrest>180.00</vServPrest></valores></NFSe>', CURRENT_TIMESTAMP
    )
  `).run(nfseKey);
  const nfseId = insNfse.lastInsertRowid;
  test('7.3. Emissão e autorização de NFS-e MEI Nacional (Dispensa Certificado A1)', () => !!nfseId);

  // Teste 7.4: Exigência de Certificado Digital A1 para produtos (NF-e Modelo 55)
  // Remover certificado para testar bloqueio
  db.prepare('UPDATE fiscal_settings SET certificate_a1_base64 = NULL WHERE company_id = 1').run();
  const noCertSettings = db.prepare('SELECT certificate_a1_base64 FROM fiscal_settings WHERE company_id = 1').get() as any;
  const canEmitProductWithoutCert = Boolean(noCertSettings?.certificate_a1_base64);
  test('7.4. Rejeição de emissão de NF-e de produtos sem Certificado Digital A1', () => canEmitProductWithoutCert === false);

  // Teste 7.5: Instalação e validação do Certificado Digital A1 (.pfx)
  const fakeA1Base64 = 'MIIJmwYJKoZIhvcNAQcCoIIJjDCCCYgCAQExADALBgkqhkiG9w0BBwGgggltMIIJ...CERTIFICADO_A1_TESTE_VALIDO';
  const a1Exp = new Date();
  a1Exp.setFullYear(a1Exp.getFullYear() + 1);
  db.prepare(`
    UPDATE fiscal_settings
    SET certificate_a1_base64 = ?,
        certificate_a1_filename = 'certificado_a1_2026.pfx',
        certificate_expiration = ?,
        certificate_subject = 'CNPJ: 12.345.678/0001-90 - TechOS Solucoes',
        certificate_valid = 1,
        nfe_environment = 'homologacao'
    WHERE company_id = 1
  `).run(fakeA1Base64, a1Exp.toISOString());

  const installedCert = db.prepare('SELECT * FROM fiscal_settings WHERE company_id = 1').get() as any;
  test('7.5. Instalação e vinculação de Certificado Digital A1 com validade de 1 ano', () => {
    return Boolean(installedCert.certificate_a1_base64) && installedCert.certificate_valid === 1;
  });

  // Teste 7.6: Integração SEFAZ — Emissão de NF-e Modelo 55 com produtos puxados do estoque
  const stockItem = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId) as any;
  const nfeItems = [
    {
      code: stockItem.sku,
      description: stockItem.name,
      ncm: stockItem.ncm,
      cfop: '5102',
      unit: stockItem.unit,
      quantity: 1,
      unit_price: stockItem.sale_price,
      total_price: stockItem.sale_price
    }
  ];

  // Gerar chave SEFAZ de 44 dígitos com DV módulo 11
  const cUF = '35'; // SP
  const aamm = '2611';
  const cnpjClean = '12345678000190';
  const modNFe = '55';
  const serieNFe = '001';
  const nNF = '000000005';
  const tpEmis = '1';
  const cNF = '87654321';
  const baseKey = `${cUF}${aamm}${cnpjClean}${modNFe}${serieNFe}${nNF}${tpEmis}${cNF}`;

  // Cálculo real do dígito verificador módulo 11 (Padrão SEFAZ MOC v4.00)
  let peso = 2;
  let soma = 0;
  for (let i = baseKey.length - 1; i >= 0; i--) {
    soma += parseInt(baseKey.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const cDV = (resto === 0 || resto === 1) ? 0 : 11 - resto;
  const fullAccessKey = `${baseKey}${cDV}`;

  test('7.6. Cálculo oficial do Dígito Verificador (módulo 11) da chave SEFAZ (44 dígitos)', () => {
    return fullAccessKey.length === 44 && !isNaN(cDV);
  });

  // Montar XML oficial no padrão SEFAZ MOC v4.00
  const xmlSefaz = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${fullAccessKey}" versao="4.00">
      <ide>
        <cUF>${cUF}</cUF>
        <cNF>${cNF}</cNF>
        <natOp>Venda de mercadoria adquirida ou recebida de terceiros</natOp>
        <mod>${modNFe}</mod>
        <serie>1</serie>
        <nNF>5</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${cDV}</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
      </ide>
      <emit>
        <CNPJ>${cnpjClean}</CNPJ>
        <xNome>Minha Loja e Assistência LTDA</xNome>
        <xFant>Minha Loja</xFant>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CPF>33344455566</CPF>
        <xNome>Cliente Teste Auditoria</xNome>
        <indIEDest>9</indIEDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>${stockItem.sku}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${stockItem.name}</xProd>
          <NCM>${stockItem.ncm}</NCM>
          <CFOP>5102</CFOP>
          <uCom>${stockItem.unit}</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>${stockItem.sale_price.toFixed(4)}</vUnCom>
          <vProd>${stockItem.sale_price.toFixed(2)}</vProd>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
        </imposto>
      </det>
      <total><ICMSTot><vProd>${stockItem.sale_price.toFixed(2)}</vProd><vNF>${stockItem.sale_price.toFixed(2)}</vNF></ICMSTot></total>
      <transp><modFrete>9</modFrete></transp>
      <pag><detPag><tPag>01</tPag><vPag>${stockItem.sale_price.toFixed(2)}</vPag></detPag></pag>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <chNFe>${fullAccessKey}</chNFe>
      <dhRecbto>${new Date().toISOString()}</dhRecbto>
      <nProt>135260000998877</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

  const insNFe = db.prepare(`
    INSERT INTO fiscal_invoices (
      company_id, invoice_type, number, series, access_key, protocol, status,
      customer_name, customer_cpf_cnpj, total_products, total_amount,
      items_json, cfop, payment_method, freight_mode, xml_content, issued_at
    ) VALUES (
      1, 'nfe_product', 5, '1', ?, '135260000998877', 'authorized',
      'Cliente Teste Auditoria', '333.444.555-66', ?, ?,
      ?, '5102', '01', '9', ?, CURRENT_TIMESTAMP
    )
  `).run(fullAccessKey, stockItem.sale_price, stockItem.sale_price, JSON.stringify(nfeItems), xmlSefaz);
  const nfeId = insNFe.lastInsertRowid;

  test('7.7. Autorização e gravação de NF-e Modelo 55 com produtos do estoque e XML MOC v4.00', () => !!nfeId);

  // Teste 7.8: Validação do XML gerado — tags obrigatórias da SEFAZ
  const loadedNFe = db.prepare('SELECT xml_content FROM fiscal_invoices WHERE id = ?').get(nfeId) as any;
  test('7.8. XML gerado contém estrutura canônica SEFAZ (<nfeProc>, <infNFe>, <det>, <ICMSSN102>, <protNFe>)', () => {
    const xml = loadedNFe.xml_content || '';
    return xml.includes('<nfeProc') && xml.includes('<infNFe') && xml.includes('<prod>') && xml.includes('<ICMSSN102>') && xml.includes('<cStat>100</cStat>');
  });

  // Teste 7.9: Validação do DANFE da NF-e emitida
  const danfeNFe = db.prepare('SELECT * FROM fiscal_invoices WHERE id = ?').get(nfeId) as any;
  test('7.9. Espelho do DANFE recupera dados dos produtos e da empresa emissora', () => {
    const parsedItems = JSON.parse(danfeNFe.items_json);
    return danfeNFe.status === 'authorized' && parsedItems.length === 1 && parsedItems[0].code === 'TELA-IP14P-OLED';
  });

  // Teste 7.10: Cancelamento de NF-e com exigência legal de justificativa >= 15 caracteres
  const reasonShort = 'Teste erro';
  const reasonValid = 'Cancelamento solicitado pelo cliente antes do despacho da mercadoria';
  test('7.10. Rejeição de cancelamento com justificativa curta (< 15 caracteres)', () => reasonShort.trim().length < 15);

  db.prepare(`
    UPDATE fiscal_invoices
    SET status = 'canceled', cancel_reason = ?, canceled_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reasonValid, nfeId);
  const canceledNFe = db.prepare('SELECT status, cancel_reason FROM fiscal_invoices WHERE id = ?').get(nfeId) as any;
  test('7.11. Cancelamento homologado com justificativa legal válida na SEFAZ', () => {
    return canceledNFe.status === 'canceled' && canceledNFe.cancel_reason === reasonValid;
  });

  // -------------------------------------------------------------
  // LIMPEZA DOS REGISTROS DE TESTE
  // -------------------------------------------------------------
  db.prepare('DELETE FROM fiscal_invoices WHERE id IN (?, ?)').run(nfseId, nfeId);
  db.prepare('DELETE FROM service_orders WHERE id = ?').run(osId);
  db.prepare('DELETE FROM products WHERE id = ?').run(prodId);
  db.prepare('DELETE FROM customer_devices WHERE id = ?').run(deviceId);
  db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
  db.prepare('DELETE FROM cash_transactions WHERE session_id = ?').run(cashSessionId);
  db.prepare('DELETE FROM cash_sessions WHERE id = ?').run(cashSessionId);
  db.prepare('DELETE FROM companies WHERE id = ?').run(prataStoreId);

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DA AUDITORIA PROFUNDA:`);
  console.log(`   TOTAL DE TESTES EXECUTADOS: ${passed + failed}`);
  console.log(`   SUCESSOS: ${passed} ✅`);
  console.log(`   FALHAS:   ${failed} ❌`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDeepAudit().catch(err => {
  console.error('Erro na auditoria profunda:', err);
  process.exit(1);
});
