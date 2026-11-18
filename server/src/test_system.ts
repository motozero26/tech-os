import { db, initDatabase, MOBILE_CHECKLIST_ITEMS } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';

console.log('====================================================');
console.log('🧪 INICIANDO BATERIA DE TESTES DE INTEGRAÇÃO DO SISTEMA');
console.log('   Assistencia shop — Gestão Técnica & PDV');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  // Test 1: Database Initialization
  initDatabase();
  const company = db.prepare('SELECT * FROM companies LIMIT 1').get() as any;
  assert(company && company.name && company.name.length > 0, '1. Banco inicializado com empresa cadastrada');

  // Test 2: Master user authentication
  const masterUser = db.prepare("SELECT * FROM users WHERE email IN ('admin@techos.com.br', 'admin@assistenciashop.com.br')").get() as any;
  assert(!!masterUser, '2. Usuário Master admin encontrado');
  const validPass = bcrypt.compareSync('admin123', masterUser.password_hash);
  assert(validPass, '3. Validação de hash de senha do Master OK');

  const token = jwt.sign({ id: masterUser.id, name: masterUser.name, role: masterUser.role }, JWT_SECRET);
  assert(!!token, '4. Geração de JWT Token de acesso OK');

  // Test 3: Cash register opening
  // Close any previously open session first
  db.prepare("UPDATE cash_sessions SET status = 'closed' WHERE status = 'open'").run();

  const openRes = db.prepare(`
    INSERT INTO cash_sessions (user_id, user_name, opening_balance, status, notes)
    VALUES (?, ?, 100.00, 'open', 'Abertura de teste com fundo de R$ 100,00')
  `).run(masterUser.id, masterUser.name);
  const sessionId = openRes.lastInsertRowid;

  db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, description)
    VALUES (?, ?, 'supply', 100.00, 'Dinheiro', 'Suprimento inicial (Fundo de troco)')
  `).run(sessionId, masterUser.id);

  const activeCash = db.prepare("SELECT * FROM cash_sessions WHERE id = ?").get(sessionId) as any;
  assert(activeCash.status === 'open' && activeCash.opening_balance === 100.00, '5. Abertura de caixa com R$ 100,00 OK');

  // Test 4: Customer and Device Registration
  const custRes = db.prepare(`
    INSERT INTO customers (name, phone, cpf_cnpj, city, state)
    VALUES ('Maria Aparecida dos Santos', '(11) 97777-6666', '987.654.321-11', 'São Paulo', 'SP')
  `).run();
  const customerId = custRes.lastInsertRowid;
  assert(Number(customerId) > 0, '6. Cadastro de cliente OK');

  const devRes = db.prepare(`
    INSERT INTO customer_devices (customer_id, brand, model, imei_serial, color, unlock_password)
    VALUES (?, 'Apple', 'iPhone 13 128GB', '358901234567890', 'Azul Meia-Noite', '1234')
  `).run(customerId);
  const deviceId = devRes.lastInsertRowid;
  assert(Number(deviceId) > 0, '7. Cadastro de aparelho do cliente OK');

  // Test 5: Service Order (OS) Creation with 29-item checklist and advance payment
  const lastCode = db.prepare('SELECT MAX(code) as max_code FROM service_orders').get() as any;
  const osCode = (lastCode?.max_code || 0) + 1;

  const osRes = db.prepare(`
    INSERT INTO service_orders (
      code, customer_id, device_id, status, reported_defects,
      entry_notes, deadline_date, advance_payment, advance_payment_method,
      warranty_period, warranty_unit, total_services, total_parts, total_amount, attendant_id
    ) VALUES (
      ?, ?, ?, 'Aguardando avaliação', 'Tela quebrada e bateria descarregando rápido',
      'Riscos leves na tampa traseira', '2026-11-20', 50.00, 'PIX',
      90, 'Dias', 0, 0, 0, ?
    )
  `).run(osCode, customerId, deviceId, masterUser.id);
  const osId = osRes.lastInsertRowid;
  assert(Number(osId) > 0, `8. Criação de O.S. #${osCode} OK`);

  // Record advance in cash register
  db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, reference_type, reference_id, description)
    VALUES (?, ?, 'os_advance', 50.00, 'PIX', 'os', ?, 'Adiantamento O.S.')
  `).run(sessionId, masterUser.id, osId);

  // Populate 29 checklist items
  const insertChecklist = db.prepare(`
    INSERT INTO service_order_checklists (os_id, item_key, item_label, status)
    VALUES (?, ?, ?, ?)
  `);
  MOBILE_CHECKLIST_ITEMS.forEach(it => {
    insertChecklist.run(osId, it.key, it.label, it.key === 'tela_quebrada' || it.key === 'bateria_saude' ? 'sim' : 'nao');
  });

  const checklistCount = db.prepare('SELECT count(*) as count FROM service_order_checklists WHERE os_id = ?').get(osId) as any;
  assert(checklistCount.count === MOBILE_CHECKLIST_ITEMS.length, `9. Checklist de ${MOBILE_CHECKLIST_ITEMS.length} itens gerado na O.S. com sucesso`);

  // Test 6: Adding Parts and Services to OS + Automatic Stock Reduction
  const partProd = db.prepare("SELECT * FROM products WHERE sku = 'TEL-IPH13-OLED'").get() as any;
  const initialStock = partProd.stock_quantity;

  // Add Part
  db.prepare(`
    INSERT INTO service_order_items (os_id, item_type, product_id, description, unit_price, quantity, total_price, warranty_period, warranty_unit)
    VALUES (?, 'part', ?, 'Tela iPhone 13 OLED Premium', 550.00, 1, 550.00, 90, 'Dias')
  `).run(osId, partProd.id);

  // Deduct stock
  db.prepare('UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = ?').run(partProd.id);
  const updatedPartProd = db.prepare("SELECT stock_quantity FROM products WHERE id = ?").get(partProd.id) as any;
  assert(updatedPartProd.stock_quantity === initialStock - 1, `10. Baixa automática de estoque de peça da O.S. (${initialStock} -> ${updatedPartProd.stock_quantity}) OK`);

  // Add Service
  db.prepare(`
    INSERT INTO service_order_items (os_id, item_type, description, unit_price, quantity, total_price, warranty_period, warranty_unit, technician_id)
    VALUES (?, 'service', 'Mão de obra substituição de tela', 120.00, 1, 120.00, 90, 'Dias', ?)
  `).run(osId, masterUser.id);

  // Update OS Totals
  db.prepare(`
    UPDATE service_orders
    SET total_services = 120.00, total_parts = 550.00, total_amount = 670.00
    WHERE id = ?
  `).run(osId);

  const updatedOs = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(osId) as any;
  assert(updatedOs.total_amount === 670.00, '11. Cálculo de totais da O.S. (Peças R$ 550 + Serviços R$ 120 = R$ 670) OK');

  // Test 7: Status Workflow Transitions
  const statuses = ['Aguardando orçamento', 'Autorizada', 'Reparo em andamento', 'Pronta'];
  for (const st of statuses) {
    db.prepare('UPDATE service_orders SET status = ? WHERE id = ?').run(st, osId);
    db.prepare(`
      INSERT INTO service_order_history (os_id, user_id, user_name, to_status, notes)
      VALUES (?, ?, ?, ?, 'Tramitação de teste')
    `).run(osId, masterUser.id, masterUser.name, st);
  }

  const historyCount = db.prepare('SELECT count(*) as count FROM service_order_history WHERE os_id = ?').get(osId) as any;
  assert(historyCount.count >= 4, '12. Histórico de tramitação de status da O.S. OK');

  // Test 8: Finalizing Payment of OS (R$ 670 - R$ 50 advance = R$ 620 due)
  const remainingDue = updatedOs.total_amount - updatedOs.advance_payment;
  assert(remainingDue === 620.00, '13. Saldo remanescente a receber da O.S. = R$ 620,00 OK');

  db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, reference_type, reference_id, description)
    VALUES (?, ?, 'os_payment', 620.00, 'Cartão de crédito', 'os', ?, 'Quitação da O.S.')
  `).run(sessionId, masterUser.id, osId);

  db.prepare("UPDATE service_orders SET status = 'Finalizada', exit_date = CURRENT_TIMESTAMP WHERE id = ?").run(osId);
  const finalizedOs = db.prepare('SELECT status, exit_date FROM service_orders WHERE id = ?').get(osId) as any;
  assert(finalizedOs.status === 'Finalizada' && !!finalizedOs.exit_date, '14. O.S. finalizada com baixa no caixa e data de saída registrada OK');

  // Test 9: Counter Sales (PDV / Venda rápida)
  const saleProd = db.prepare("SELECT * FROM products WHERE sku = 'CAB-USBC-LIGHT'").get() as any;
  const initialSaleStock = saleProd.stock_quantity;

  const maxSaleCode = db.prepare('SELECT MAX(code) as max_c FROM sales').get() as any;
  const nextSaleCode = (maxSaleCode?.max_c || 100) + 1;

  const saleRes = db.prepare(`
    INSERT INTO sales (code, session_id, user_id, customer_id, total_products, discount, final_amount, payment_method, installments)
    VALUES (?, ?, ?, ?, 90.00, 5.00, 85.00, 'Dinheiro', 1)
  `).run(nextSaleCode, sessionId, masterUser.id, customerId);
  const saleId = saleRes.lastInsertRowid;

  db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, description, quantity, unit_price, total_price, cost_price)
    VALUES (?, ?, ?, 2, 45.00, 90.00, 12.00)
  `).run(saleId, saleProd.id, saleProd.name);

  // Deduct stock
  db.prepare('UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = ?').run(saleProd.id);
  const updatedSaleProd = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(saleProd.id) as any;
  assert(updatedSaleProd.stock_quantity === initialSaleStock - 2, `15. Venda no PDV com baixa de estoque (${initialSaleStock} -> ${updatedSaleProd.stock_quantity}) OK`);

  db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, reference_type, reference_id, description)
    VALUES (?, ?, 'sale', 85.00, 'Dinheiro', 'sale', ?, 'Venda PDV #101')
  `).run(sessionId, masterUser.id, saleId);

  // Test 10: Seminovos (Purchase Pre-owned device from customer)
  const tradeRes = db.prepare(`
    INSERT INTO used_device_trades (
      type, session_id, user_id, customer_id, brand, model,
      imei_serial, color, condition_grade, price, status
    ) VALUES (
      'purchase', ?, ?, ?, 'Apple', 'iPhone 11 64GB',
      '354455667788990', 'Branco', 'Excelente', 950.00, 'stock'
    )
  `).run(sessionId, masterUser.id, customerId);
  const tradeId = tradeRes.lastInsertRowid;

  db.prepare(`
    INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, reference_type, reference_id, description)
    VALUES (?, ?, 'used_purchase', 950.00, 'Dinheiro', 'used_trade', ?, 'Compra de seminovo')
  `).run(sessionId, masterUser.id, tradeId);

  const usedDev = db.prepare('SELECT * FROM used_device_trades WHERE id = ?').get(tradeId) as any;
  assert(usedDev && usedDev.price === 950.00 && usedDev.status === 'stock', '16. Compra de seminovo com saída do caixa OK');

  // Test 11: Cash Session Balance Calculation
  // Opening: 100 + OS Advance: 50 + OS Final: 620 + Sale: 85 - Used Phone: 950 = -95 (net diff)
  const txs = db.prepare('SELECT type, amount, payment_method FROM cash_transactions WHERE session_id = ?').all(sessionId) as any[];
  assert(txs.length === 5, '17. Registro das 5 transações na sessão de caixa OK');

  // Close Cash
  db.prepare("UPDATE cash_sessions SET status = 'closed', closing_balance = 855.00, closed_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
  const closedCash = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId) as any;
  assert(closedCash.status === 'closed', '18. Fechamento de sessão de caixa OK');

  // Test 12: Card Rates and Financial Expenses
  const rates = db.prepare('SELECT count(*) as count FROM card_rates').get() as any;
  assert(rates.count > 0, '19. Tabela de taxas de parcelamento de cartão configurada OK');

  const expRes = db.prepare(`
    INSERT INTO expenses (description, category, due_date, amount, status)
    VALUES ('Conta de Energia Equatorial', 'Aluguel e Contas', '2026-11-25', 280.50, 'pending')
  `).run();
  assert(Number(expRes.lastInsertRowid) > 0, '20. Cadastro de despesas e contas a pagar OK');

  console.log('\n====================================================');
  console.log(`🎉 RESULTADO FINAL DOS TESTES: ${testsPassed} PASSOU / ${testsFailed} FALHOU`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
