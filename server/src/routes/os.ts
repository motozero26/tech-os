import { Router, Response } from 'express';
import { db, MOBILE_CHECKLIST_ITEMS } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Hub counters
router.get('/hub-counts', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const counts = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status IN ('Aguardando avaliação', 'Aguardando orçamento') THEN 1 END) as evaluation,
      COUNT(CASE WHEN status IN ('Autorizada', 'Reparo em andamento') THEN 1 END) as authorized,
      COUNT(CASE WHEN status = 'Pronta' THEN 1 END) as ready,
      COUNT(CASE WHEN status IN ('Finalizada', 'Finalizada sem reparo', 'Devolver na garantia') THEN 1 END) as finished,
      COUNT(CASE WHEN status = 'Laudo técnico' THEN 1 END) as report
    FROM service_orders
    WHERE company_id = ?
  `).get(companyId);

  return res.json(counts);
});

// Next code
router.get('/next-code', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const lastCode = db.prepare('SELECT MAX(code) as max_code FROM service_orders WHERE company_id = ?').get(companyId) as { max_code: number | null };
  const nextCode = (lastCode?.max_code || 0) + 1;
  return res.json({ nextCode });
});

// List OS with filters
router.get('/', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { group = 'all', status_code, q, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClauses: string[] = ['so.company_id = ?'];
  let params: any[] = [companyId];

  if (group === 'evaluation') {
    whereClauses.push("so.status IN ('Aguardando avaliação', 'Aguardando orçamento')");
  } else if (group === 'authorized') {
    whereClauses.push("so.status IN ('Autorizada', 'Reparo em andamento')");
  } else if (group === 'ready') {
    whereClauses.push("so.status = 'Pronta'");
  } else if (group === 'finished') {
    whereClauses.push("so.status IN ('Finalizada', 'Finalizada sem reparo', 'Devolver na garantia')");
  } else if (group === 'report') {
    whereClauses.push("so.status = 'Laudo técnico'");
  }

  if (status_code) {
    whereClauses.push("so.status = ?");
    params.push(status_code);
  }

  if (q) {
    whereClauses.push(`(
      so.code LIKE ? OR
      c.name LIKE ? OR
      c.cpf_cnpj LIKE ? OR
      c.phone LIKE ? OR
      cd.model LIKE ? OR
      cd.imei_serial LIKE ?
    )`);
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const totalCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM service_orders so
    JOIN customers c ON c.id = so.customer_id
    LEFT JOIN customer_devices cd ON cd.id = so.device_id
    ${whereSql}
  `).get(...params) as { count: number };

  const orders = db.prepare(`
    SELECT so.*,
           c.name as customer_name, c.phone as customer_phone, c.cpf_cnpj as customer_cpf,
           cd.device_type, cd.brand as device_brand, cd.model as device_model, cd.imei_serial, cd.color as device_color,
           u.name as technician_name
    FROM service_orders so
    JOIN customers c ON c.id = so.customer_id
    LEFT JOIN customer_devices cd ON cd.id = so.device_id
    LEFT JOIN users u ON u.id = so.technician_id
    ${whereSql}
    ORDER BY so.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  return res.json({
    data: orders,
    total: totalCount.count,
    page: Number(page),
    limit: Number(limit)
  });
});

// Create new OS
router.post('/create', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    customer_id, customer_name, customer_phone, customer_cpf,
    device_id, device_brand, device_model, device_imei, device_color, device_password,
    reported_defects, entry_notes, entry_photos, technical_report, internal_notes,
    deadline_date, advance_payment = 0, advance_payment_method = 'Dinheiro',
    warranty_period = 90, warranty_unit = 'Dias', technician_id
  } = req.body;

  const runTransaction = db.transaction(() => {
    // 1. Resolve Customer
    let resolvedCustomerId = customer_id;
    if (!resolvedCustomerId) {
      if (!customer_name) {
        throw new Error('Nome do cliente é obrigatório');
      }
      const newCust = db.prepare(`
        INSERT INTO customers (company_id, name, phone, cpf_cnpj)
        VALUES (?, ?, ?, ?)
      `).run(companyId, customer_name, customer_phone || null, customer_cpf || null);
      resolvedCustomerId = newCust.lastInsertRowid;
    }

    // 2. Resolve Device
    let resolvedDeviceId = device_id;
    if (!resolvedDeviceId && (device_brand || device_model)) {
      const newDev = db.prepare(`
        INSERT INTO customer_devices (customer_id, brand, model, imei_serial, color, unlock_password)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        resolvedCustomerId,
        device_brand || 'Genérico',
        device_model || 'Não especificado',
        device_imei || null,
        device_color || null,
        device_password || null
      );
      resolvedDeviceId = newDev.lastInsertRowid;
    }

    // 3. Sequential code scoped by company
    const lastCode = db.prepare('SELECT MAX(code) as max_code FROM service_orders WHERE company_id = ?').get(companyId) as { max_code: number | null };
    const code = (lastCode?.max_code || 0) + 1;

    // 4. Insert OS
    const advVal = Number(advance_payment) || 0;
    const photosJson = entry_photos ? (Array.isArray(entry_photos) ? JSON.stringify(entry_photos) : String(entry_photos)) : null;

    const osInsert = db.prepare(`
      INSERT INTO service_orders (
        company_id, code, customer_id, device_id, status, reported_defects,
        entry_notes, entry_photos, technical_report, internal_notes, deadline_date,
        advance_payment, advance_payment_method, warranty_period, warranty_unit,
        total_services, total_parts, discount, total_amount, technician_id, attendant_id
      ) VALUES (
        ?, ?, ?, ?, 'Aguardando avaliação', ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        0, 0, 0, 0, ?, ?
      )
    `).run(
      companyId, code, resolvedCustomerId, resolvedDeviceId || null, reported_defects || null,
      entry_notes || null, photosJson, technical_report || null, internal_notes || null, deadline_date || null,
      advVal, advVal > 0 ? advance_payment_method : null, warranty_period, warranty_unit,
      technician_id || null, req.user!.id
    );

    const osId = osInsert.lastInsertRowid;

    // 5. Populate Checklist with 29 items
    const checklistItems = req.body.checklist || [];
    const insertChecklist = db.prepare(`
      INSERT INTO service_order_checklists (os_id, item_key, item_label, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    MOBILE_CHECKLIST_ITEMS.forEach(defItem => {
      const provided = checklistItems.find((c: any) => c.key === defItem.key);
      insertChecklist.run(
        osId,
        defItem.key,
        defItem.label,
        provided ? provided.status : 'nao',
        provided ? provided.notes || null : null
      );
    });

    // 6. Record Advance Payment in Cash Register if any
    if (advVal > 0) {
      const openSession = db.prepare("SELECT id FROM cash_sessions WHERE status = 'open' AND company_id = ? ORDER BY id DESC LIMIT 1").get(companyId) as { id: number } | undefined;
      if (!openSession) {
        throw new Error('Não é possível receber adiantamento com o caixa fechado. Abra o caixa primeiro.');
      }
      db.prepare(`
        INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, reference_type, reference_id, description)
        VALUES (?, ?, 'os_advance', ?, ?, 'os', ?, ?)
      `).run(
        openSession.id, req.user!.id, advVal, advance_payment_method, osId,
        `Adiantamento da O.S. #${code}`
      );
    }

    // 7. Initial History
    db.prepare(`
      INSERT INTO service_order_history (os_id, user_id, user_name, from_status, to_status, notes)
      VALUES (?, ?, ?, NULL, 'Aguardando avaliação', 'Abertura da O.S.')
    `).run(osId, req.user!.id, req.user!.name);

    logAudit(req.user!.id, req.user!.name, 'Ordens de Serviço', 'Criação', `Criou a O.S. #${code} para o cliente ID ${resolvedCustomerId}`, Number(osId), undefined, companyId);

    return { id: osId, code };
  });

  try {
    const result = runTransaction();
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao criar O.S.' });
  }
});

// Get OS details
router.get('/:id', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const osId = req.params.id;

  const os = db.prepare(`
    SELECT so.*,
           c.name as customer_name, c.phone as customer_phone, c.whatsapp as customer_whatsapp,
           c.cpf_cnpj as customer_cpf, c.email as customer_email, c.address as customer_address,
           c.city as customer_city, c.state as customer_state,
           cd.device_type, cd.brand as device_brand, cd.model as device_model,
           cd.imei_serial, cd.color as device_color, cd.unlock_password, cd.notes as device_notes,
           u.name as technician_name,
           att.name as attendant_name
    FROM service_orders so
    JOIN customers c ON c.id = so.customer_id
    LEFT JOIN customer_devices cd ON cd.id = so.device_id
    LEFT JOIN users u ON u.id = so.technician_id
    LEFT JOIN users att ON att.id = so.attendant_id
    WHERE so.id = ? AND so.company_id = ?
  `).get(osId, companyId) as any;

  if (!os) {
    return res.status(404).json({ error: 'Ordem de serviço não encontrada ou não pertence a esta empresa.' });
  }

  if (os.entry_photos) {
    try {
      os.entry_photos = typeof os.entry_photos === 'string' ? JSON.parse(os.entry_photos) : os.entry_photos;
    } catch {
      os.entry_photos = [];
    }
  } else {
    os.entry_photos = [];
  }

  const items = db.prepare(`
    SELECT soi.*, u.name as technician_name
    FROM service_order_items soi
    LEFT JOIN users u ON u.id = soi.technician_id
    WHERE soi.os_id = ?
    ORDER BY soi.id ASC
  `).all(osId);

  const checklist = db.prepare(`
    SELECT * FROM service_order_checklists WHERE os_id = ? ORDER BY id ASC
  `).all(osId);

  const history = db.prepare(`
    SELECT * FROM service_order_history WHERE os_id = ? ORDER BY id DESC
  `).all(osId);

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(os.company_id || companyId);

  return res.json({
    os,
    items,
    checklist,
    history,
    company
  });
});

// Update/Add entry photos to OS
router.post('/:id/photos', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const osId = req.params.id;
  const { photos } = req.body;

  if (!Array.isArray(photos)) {
    return res.status(400).json({ error: 'Formato inválido. "photos" deve ser uma lista de imagens.' });
  }

  const os = db.prepare('SELECT id FROM service_orders WHERE id = ? AND company_id = ?').get(osId, companyId);
  if (!os) {
    return res.status(404).json({ error: 'Ordem de serviço não encontrada ou não pertence a esta empresa.' });
  }

  const photosJson = JSON.stringify(photos);
  db.prepare(`
    UPDATE service_orders
    SET entry_photos = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).run(photosJson, osId, companyId);

  logAudit(req.user!.id, req.user!.name, 'Ordens de Serviço', 'Atualização', `Atualizou as fotos de entrada da O.S. ID ${osId}`, Number(osId), undefined, companyId);

  return res.json({ success: true, photos });
});

// Update OS Status
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const osId = req.params.id;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status é obrigatório' });
  }

  const currentOs = db.prepare('SELECT id, code, status FROM service_orders WHERE id = ? AND company_id = ?').get(osId, companyId) as any;
  if (!currentOs) {
    return res.status(404).json({ error: 'O.S. não encontrada ou não pertence a esta empresa.' });
  }

  const fromStatus = currentOs.status;

  const updateTx = db.transaction(() => {
    let exitDateSql = '';
    if (['Finalizada', 'Pronta'].includes(status)) {
      exitDateSql = ", exit_date = CURRENT_TIMESTAMP";
    }

    db.prepare(`
      UPDATE service_orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP ${exitDateSql}
      WHERE id = ? AND company_id = ?
    `).run(status, osId, companyId);

    db.prepare(`
      INSERT INTO service_order_history (os_id, user_id, user_name, from_status, to_status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(osId, req.user!.id, req.user!.name, fromStatus, status, notes || `Status alterado de ${fromStatus} para ${status}`);

    logAudit(req.user!.id, req.user!.name, 'Ordens de Serviço', 'Alteração de Status', `O.S. #${currentOs.code} alterada de ${fromStatus} para ${status}`, Number(osId), undefined, companyId);
  });

  updateTx();
  return res.json({ success: true, from: fromStatus, to: status });
});

// Add Item (Part or Service)
router.post('/:id/items', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const osId = req.params.id;
  const { item_type, product_id, service_id, description, unit_price, quantity = 1, warranty_period = 90, warranty_unit = 'Dias', technician_id } = req.body;

  if (!description || !unit_price) {
    return res.status(400).json({ error: 'Descrição e preço unitário são obrigatórios' });
  }

  const os = db.prepare('SELECT id, code FROM service_orders WHERE id = ? AND company_id = ?').get(osId, companyId) as any;
  if (!os) {
    return res.status(404).json({ error: 'O.S. não encontrada ou não pertence a esta empresa.' });
  }

  const numQty = Number(quantity) || 1;
  const numPrice = Number(unit_price) || 0;
  const totalPrice = numQty * numPrice;

  const addItemTx = db.transaction(() => {
    // If it's a part linked to inventory product, check stock and deduct
    if (item_type === 'part' && product_id) {
      const prod = db.prepare('SELECT stock_quantity, name FROM products WHERE id = ? AND company_id = ?').get(product_id, companyId) as any;
      if (prod) {
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND company_id = ?').run(numQty, product_id, companyId);
      }
    }

    db.prepare(`
      INSERT INTO service_order_items (
        os_id, item_type, product_id, service_id, description,
        unit_price, quantity, total_price, warranty_period, warranty_unit, technician_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      osId, item_type, product_id || null, service_id || null, description,
      numPrice, numQty, totalPrice, warranty_period, warranty_unit, technician_id || null
    );

    // Recalculate OS totals
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN item_type = 'service' THEN total_price ELSE 0 END), 0) as total_services,
        COALESCE(SUM(CASE WHEN item_type = 'part' THEN total_price ELSE 0 END), 0) as total_parts
      FROM service_order_items
      WHERE os_id = ?
    `).get(osId) as { total_services: number; total_parts: number };

    const totalAmount = totals.total_services + totals.total_parts;

    db.prepare(`
      UPDATE service_orders
      SET total_services = ?, total_parts = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).run(totals.total_services, totals.total_parts, totalAmount, osId, companyId);

    logAudit(req.user!.id, req.user!.name, 'Ordens de Serviço', 'Item Adicionado', `Adicionou ${item_type === 'part' ? 'peça' : 'serviço'} "${description}" na O.S. #${os.code}`, Number(osId), undefined, companyId);
  });

  addItemTx();
  return res.status(201).json({ success: true });
});

// Delete Item
router.delete('/:id/items/:itemId', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { id: osId, itemId } = req.params;

  const os = db.prepare('SELECT id FROM service_orders WHERE id = ? AND company_id = ?').get(osId, companyId);
  if (!os) {
    return res.status(404).json({ error: 'O.S. não encontrada ou não pertence a esta empresa.' });
  }

  const item = db.prepare('SELECT * FROM service_order_items WHERE id = ? AND os_id = ?').get(itemId, osId) as any;
  if (!item) {
    return res.status(404).json({ error: 'Item não encontrado na O.S.' });
  }

  const deleteItemTx = db.transaction(() => {
    // If it was a part with product_id, restore stock!
    if (item.item_type === 'part' && item.product_id) {
      db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND company_id = ?').run(item.quantity, item.product_id, companyId);
    }

    db.prepare('DELETE FROM service_order_items WHERE id = ?').run(itemId);

    // Recalculate OS totals
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN item_type = 'service' THEN total_price ELSE 0 END), 0) as total_services,
        COALESCE(SUM(CASE WHEN item_type = 'part' THEN total_price ELSE 0 END), 0) as total_parts
      FROM service_order_items
      WHERE os_id = ?
    `).get(osId) as { total_services: number; total_parts: number };

    const totalAmount = totals.total_services + totals.total_parts;

    db.prepare(`
      UPDATE service_orders
      SET total_services = ?, total_parts = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).run(totals.total_services, totals.total_parts, totalAmount, osId, companyId);
  });

  deleteItemTx();
  return res.json({ success: true });
});

// Update Checklist
router.put('/:id/checklist', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const osId = req.params.id;
  const { items } = req.body; // array of { id, status, notes }

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Itens do checklist devem ser uma lista' });
  }

  const os = db.prepare('SELECT id FROM service_orders WHERE id = ? AND company_id = ?').get(osId, companyId);
  if (!os) {
    return res.status(404).json({ error: 'O.S. não encontrada ou não pertence a esta empresa.' });
  }

  const updateChecklistTx = db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE service_order_checklists
      SET status = ?, notes = ?
      WHERE id = ? AND os_id = ?
    `);

    items.forEach(it => {
      updateStmt.run(it.status, it.notes || null, it.id, osId);
    });
  });

  updateChecklistTx();
  return res.json({ success: true });
});

// Finalize OS Payment
router.post('/:id/payment', (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const osId = req.params.id;
  const { payment_method = 'Dinheiro', discount = 0, final_status = 'Finalizada' } = req.body;

  const os = db.prepare('SELECT * FROM service_orders WHERE id = ? AND company_id = ?').get(osId, companyId) as any;
  if (!os) {
    return res.status(404).json({ error: 'O.S. não encontrada ou não pertence a esta empresa.' });
  }

  const openSession = db.prepare("SELECT id FROM cash_sessions WHERE status = 'open' AND company_id = ? ORDER BY id DESC LIMIT 1").get(companyId) as { id: number } | undefined;
  if (!openSession) {
    return res.status(400).json({ error: 'O caixa está fechado! Abra o caixa antes de registrar o recebimento da O.S.' });
  }

  const numDiscount = Number(discount) || 0;
  const netDue = Math.max(0, (os.total_amount - os.advance_payment - numDiscount));

  const payTx = db.transaction(() => {
    if (netDue > 0) {
      db.prepare(`
        INSERT INTO cash_transactions (session_id, user_id, type, amount, payment_method, reference_type, reference_id, description)
        VALUES (?, ?, 'os_payment', ?, ?, 'os', ?, ?)
      `).run(
        openSession.id, req.user!.id, netDue, payment_method, osId,
        `Recebimento O.S. #${os.code}`
      );
    }

    db.prepare(`
      UPDATE service_orders
      SET discount = ?, status = ?, exit_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).run(numDiscount, final_status, osId, companyId);

    db.prepare(`
      INSERT INTO service_order_history (os_id, user_id, user_name, from_status, to_status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(osId, req.user!.id, req.user!.name, os.status, final_status, `Pagamento recebido via ${payment_method}. O.S. ${final_status}.`);

    logAudit(req.user!.id, req.user!.name, 'Ordens de Serviço', 'Pagamento', `Recebeu R$ ${netDue.toFixed(2)} referente à O.S. #${os.code}`, Number(osId), undefined, companyId);
  });

  payTx();
  return res.json({ success: true, netDue });
});

export default router;
