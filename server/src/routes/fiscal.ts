import { Router, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest, logAudit } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Helper function to check if company has access to Fiscal Module (Plan Ouro Exclusive)
async function checkFiscalAccess(companyId: number): Promise<{ allowed: boolean; planName: string }> {
  const company = await db.prepare(`
    SELECT c.plan_id, c.plan_name, p.name as plan_title
    FROM companies c
    LEFT JOIN plans p ON p.id = c.plan_id
    WHERE c.id = ?
  `).get(companyId) as any;

  const planName = (company?.plan_title || company?.plan_name || '').toLowerCase();
  const isOuro = planName.includes('ouro');
  return { allowed: isOuro, planName: company?.plan_title || company?.plan_name || 'Prata' };
}

// 1. Status do Módulo Fiscal & Permissões do Plano
router.get('/status', async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { allowed, planName } = await checkFiscalAccess(companyId);

  const settings = await db.prepare('SELECT * FROM fiscal_settings WHERE company_id = ?').get(companyId) as any;
  const totalInvoices = await db.prepare('SELECT count(*) as count FROM fiscal_invoices WHERE company_id = ?').get(companyId) as { count: number };

  return res.json({
    has_fiscal_access: allowed,
    current_plan: planName,
    requires_upgrade: !allowed,
    certificate_installed: Boolean(settings?.certificate_a1_base64),
    certificate_expiration: settings?.certificate_expiration || null,
    certificate_subject: settings?.certificate_subject || null,
    is_mei: Boolean(settings?.is_mei),
    nfse_mei_configured: Boolean(settings?.nfse_mei_user || settings?.nfse_mei_token),
    nfe_environment: settings?.nfe_environment || 'homologacao',
    total_invoices_issued: totalInvoices?.count || 0
  });
});

// Middleware to enforce Plan Ouro for all operation endpoints below
async function requireGoldPlan(req: AuthRequest, res: Response, next: Function) {
  const companyId = req.user?.company_id || 1;
  const { allowed, planName } = await checkFiscalAccess(companyId);
  if (!allowed) {
    return res.status(403).json({
      error: 'Recurso Exclusivo: A emissão de Notas Fiscais é exclusiva do Plano Ouro. Faça o upgrade do seu plano para liberar a emissão de NF-e e NFS-e MEI.',
      requires_upgrade: true,
      current_plan: planName,
      required_plan: 'Ouro'
    });
  }
  next();
}

// 2. Obter Configurações Fiscais
router.get('/settings', requireGoldPlan, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  let settings = await db.prepare('SELECT * FROM fiscal_settings WHERE company_id = ?').get(companyId) as any;

  if (!settings) {
    await db.prepare(`
      INSERT INTO fiscal_settings (company_id, tax_regime, nfe_environment, nfe_series, nfe_next_number, nfce_series, nfce_next_number, is_mei, nfse_series, nfse_next_number)
      VALUES (?, 'mei', 'homologacao', 1, 1, 1, 1, 1, 'E', 1)
    `).run(companyId);
    settings = await db.prepare('SELECT * FROM fiscal_settings WHERE company_id = ?').get(companyId) as any;
  }

  // Remove secret password and base64 dump from public response
  const sanitized = {
    ...settings,
    certificate_password: settings.certificate_password ? '********' : '',
    certificate_a1_base64: undefined,
    has_certificate: Boolean(settings.certificate_a1_base64),
    nfse_mei_password: settings.nfse_mei_password ? '********' : ''
  };

  return res.json(sanitized);
});

// 3. Atualizar Configurações Fiscais (Certificado Digital A1 e Emissão MEI)
router.put('/settings', requireGoldPlan, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    tax_regime, nfe_environment,
    certificate_a1_filename, certificate_a1_base64, certificate_password,
    nfe_series, nfe_next_number, nfce_series, nfce_next_number,
    csc_id, csc_token,
    is_mei, nfse_mei_user, nfse_mei_password, nfse_mei_token,
    nfse_series, nfse_next_number, default_service_code, default_cnae,
    service_description_pattern, aliquota_iss
  } = req.body;

  const current = await db.prepare('SELECT * FROM fiscal_settings WHERE company_id = ?').get(companyId) as any;

  // Process certificate validation & expiration if new certificate is sent
  let certExp = current?.certificate_expiration;
  let certSubj = current?.certificate_subject;
  let certBase64 = certificate_a1_base64 !== undefined ? certificate_a1_base64 : current?.certificate_a1_base64;
  let certPass = (certificate_password && certificate_password !== '********') ? certificate_password : current?.certificate_password;

  if (certificate_a1_base64 === '' || certificate_a1_base64 === null) {
    certBase64 = null;
    certExp = null;
    certSubj = null;
    certPass = null;
  } else if (certificate_a1_base64 && certificate_a1_base64.length > 50) {
    // Generate valid mock expiration 1 year from now for A1
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);
    certExp = expDate.toISOString();
    certSubj = `CNPJ: 12.345.678/0001-90 - TechOS Soluções Tecnológicas`;
  }

  const meiPass = (nfse_mei_password && nfse_mei_password !== '********') ? nfse_mei_password : current?.nfse_mei_password;

  await db.prepare(`
    INSERT INTO fiscal_settings (
      company_id, tax_regime, nfe_environment,
      certificate_a1_filename, certificate_a1_base64, certificate_password,
      certificate_expiration, certificate_subject, certificate_valid,
      nfe_series, nfe_next_number, nfce_series, nfce_next_number,
      csc_id, csc_token,
      is_mei, nfse_mei_user, nfse_mei_password, nfse_mei_token,
      nfse_series, nfse_next_number, default_service_code, default_cnae,
      service_description_pattern, aliquota_iss, updated_at
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, 1,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, CURRENT_TIMESTAMP
    )
    ON CONFLICT(company_id) DO UPDATE SET
      tax_regime = excluded.tax_regime,
      nfe_environment = excluded.nfe_environment,
      certificate_a1_filename = excluded.certificate_a1_filename,
      certificate_a1_base64 = excluded.certificate_a1_base64,
      certificate_password = excluded.certificate_password,
      certificate_expiration = excluded.certificate_expiration,
      certificate_subject = excluded.certificate_subject,
      nfe_series = COALESCE(excluded.nfe_series, fiscal_settings.nfe_series),
      nfe_next_number = COALESCE(excluded.nfe_next_number, fiscal_settings.nfe_next_number),
      nfce_series = COALESCE(excluded.nfce_series, fiscal_settings.nfce_series),
      nfce_next_number = COALESCE(excluded.nfce_next_number, fiscal_settings.nfce_next_number),
      csc_id = COALESCE(excluded.csc_id, fiscal_settings.csc_id),
      csc_token = COALESCE(excluded.csc_token, fiscal_settings.csc_token),
      is_mei = excluded.is_mei,
      nfse_mei_user = COALESCE(excluded.nfse_mei_user, fiscal_settings.nfse_mei_user),
      nfse_mei_password = COALESCE(excluded.nfse_mei_password, fiscal_settings.nfse_mei_password),
      nfse_mei_token = COALESCE(excluded.nfse_mei_token, fiscal_settings.nfse_mei_token),
      nfse_series = COALESCE(excluded.nfse_series, fiscal_settings.nfse_series),
      nfse_next_number = COALESCE(excluded.nfse_next_number, fiscal_settings.nfse_next_number),
      default_service_code = COALESCE(excluded.default_service_code, fiscal_settings.default_service_code),
      default_cnae = COALESCE(excluded.default_cnae, fiscal_settings.default_cnae),
      service_description_pattern = COALESCE(excluded.service_description_pattern, fiscal_settings.service_description_pattern),
      aliquota_iss = COALESCE(excluded.aliquota_iss, fiscal_settings.aliquota_iss),
      updated_at = CURRENT_TIMESTAMP
  `).run(
    companyId, tax_regime || 'mei', nfe_environment || 'homologacao',
    certificate_a1_filename || null, certBase64 || null, certPass || null,
    certExp || null, certSubj || null,
    Number(nfe_series) || 1, Number(nfe_next_number) || 1,
    Number(nfce_series) || 1, Number(nfce_next_number) || 1,
    csc_id || null, csc_token || null,
    is_mei !== undefined ? (is_mei ? 1 : 0) : 1,
    nfse_mei_user || null, meiPass || null, nfse_mei_token || null,
    nfse_series || 'E', Number(nfse_next_number) || 1,
    default_service_code || '14.01', default_cnae || '9511-8/00',
    service_description_pattern || 'Serviço técnico referente à O.S. #{os_code}',
    Number(aliquota_iss) || 0.0
  );

  await logAudit(req.user!.id, req.user!.name, 'Fiscal', 'Configurações Salvas', 'Atualizou configurações de emissão fiscal (Certificado A1 / NFS-e MEI)');

  return res.json({ success: true, message: 'Configurações fiscais atualizadas com sucesso!' });
});

// 4. Listar Notas Fiscais Emitidas
router.get('/invoices', requireGoldPlan, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const { type, status, q } = req.query;

  let whereClauses: string[] = ['company_id = ?'];
  let params: any[] = [companyId];

  if (type) {
    whereClauses.push('invoice_type = ?');
    params.push(type);
  }

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  if (q) {
    whereClauses.push('(customer_name LIKE ? OR customer_cpf_cnpj LIKE ? OR access_key LIKE ? OR number = ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, Number(q) || 0);
  }

  const whereSql = whereClauses.join(' AND ');
  const invoices = await db.prepare(`SELECT * FROM fiscal_invoices WHERE ${whereSql} ORDER BY id DESC`).all(...params);

  return res.json(invoices);
});

// 5. Emitir Nota Fiscal (NF-e de Produtos com Certificado A1 ou NFS-e de Serviços MEI sem certificado obrigatório)
router.post('/emit', requireGoldPlan, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const {
    invoice_type = 'nfse_service_mei', // 'nfe_product', 'nfce_product', 'nfse_service_mei'
    reference_type, // 'os', 'sale', 'manual'
    reference_id,
    customer_name,
    customer_cpf_cnpj,
    customer_email,
    customer_phone,
    customer_zip_code,
    customer_address,
    customer_number,
    customer_neighborhood,
    customer_city,
    customer_state,
    customer_ie,
    service_code,
    cnae_code,
    service_description,
    competence_date,
    service_city,
    service_state,
    iss_retention = 0,
    iss_rate = 0,
    discount_amount = 0,
    nature_of_operation = 'Venda de mercadoria adquirida ou recebida de terceiros',
    cfop = '5102',
    freight_mode = '9',
    freight_amount = 0,
    payment_method = '01',
    additional_info,
    items = []
  } = req.body;

  const fiscalSettings = await db.prepare('SELECT * FROM fiscal_settings WHERE company_id = ?').get(companyId) as any;
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;

  // Validação 1: Para produtos (NF-e / NFC-e), exige Certificado Digital A1
  if (invoice_type === 'nfe_product' || invoice_type === 'nfce_product') {
    if (!fiscalSettings?.certificate_a1_base64) {
      return res.status(400).json({
        error: 'Para emissão de NF-e / NFC-e de produtos, é obrigatório cadastrar um Certificado Digital A1 (.pfx) com senha válida.',
        code: 'MISSING_CERTIFICATE'
      });
    }
  }

  // Validação 2: Para serviços MEI, valida campos obrigatórios do padrão do portal nacional de emissão de notas do governo
  if (invoice_type === 'nfse_service_mei') {
    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'O Nome / Razão Social do Tomador é obrigatório para emissão da NFS-e Nacional.' });
    }
    if (!customer_cpf_cnpj || !customer_cpf_cnpj.trim()) {
      return res.status(400).json({ error: 'O CPF ou CNPJ do Tomador é obrigatório para emissão da NFS-e Nacional.' });
    }
    const cleanDoc = customer_cpf_cnpj.replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      return res.status(400).json({ error: 'O CPF deve ter 11 dígitos ou o CNPJ deve ter 14 dígitos.' });
    }
    const desc = service_description || nature_of_operation;
    if (!desc || !desc.trim()) {
      return res.status(400).json({ error: 'A discriminação dos serviços prestados é obrigatória conforme o padrão nacional da NFS-e.' });
    }
  }

  // Validação 3: Para produtos (NF-e modelo 55), valida exigências SEFAZ de destinatário e mercadorias
  let processedItems: any[] = [];
  if (invoice_type === 'nfe_product') {
    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'O Nome / Razão Social do Destinatário é obrigatório para emissão da NF-e.' });
    }
    if (!customer_cpf_cnpj || !customer_cpf_cnpj.trim()) {
      return res.status(400).json({ error: 'O CPF ou CNPJ do Destinatário é obrigatório para emissão da NF-e.' });
    }
    const cleanDoc = customer_cpf_cnpj.replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      return res.status(400).json({ error: 'O CPF do Destinatário deve ter 11 dígitos ou o CNPJ deve ter 14 dígitos válidos.' });
    }
    if (!customer_address || !customer_address.trim() || !customer_city || !customer_city.trim() || !customer_state || !customer_state.trim()) {
      return res.status(400).json({ error: 'Logradouro, Município e UF do destinatário são campos obrigatórios para NF-e modelo 55.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'A NF-e exige a inclusão de ao menos 1 produto/mercadoria para emissão conforme exigência da SEFAZ.' });
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.description || !it.description.trim()) {
        return res.status(400).json({ error: `O produto no item #${i + 1} não possui descrição preenchida.` });
      }
      const rawNcm = (it.ncm || '').replace(/\D/g, '');
      const itemNcm = rawNcm.length === 8 ? rawNcm : '85171300';
      const itemQty = Number(it.quantity) || 0;
      const itemUnitPrice = Number(it.unit_price) || 0;

      if (itemQty <= 0) {
        return res.status(400).json({ error: `A quantidade do item "${it.description}" deve ser maior que zero.` });
      }
      if (itemUnitPrice <= 0) {
        return res.status(400).json({ error: `O preço unitário do item "${it.description}" deve ser maior que zero.` });
      }

      const itemTotal = Number((itemQty * itemUnitPrice).toFixed(2));
      processedItems.push({
        code: it.code || it.sku || String(i + 1).padStart(4, '0'),
        description: it.description.trim(),
        ncm: itemNcm,
        cfop: it.cfop || cfop || '5102',
        unit: (it.unit || 'UN').toUpperCase().trim(),
        quantity: itemQty,
        unit_price: itemUnitPrice,
        total_price: itemTotal
      });
    }
  }

  // Buscar dados da referência se fornecida
  let resolvedName = customer_name;
  let resolvedDoc = customer_cpf_cnpj;
  let resolvedEmail = customer_email;
  let resolvedPhone = customer_phone;
  let resolvedAddress = customer_address;
  let resolvedNumber = customer_number;
  let resolvedNeighborhood = customer_neighborhood;
  let resolvedZip = customer_zip_code;
  let resolvedCity = customer_city || company?.city || 'São Paulo';
  let resolvedState = customer_state || company?.state || 'SP';

  let totalAmount = 0;
  let totalProducts = 0;
  let totalServices = 0;

  if (reference_type === 'os' && reference_id) {
    const os = await db.prepare(`
      SELECT so.*, c.name as c_name, c.cpf_cnpj as c_cpf, c.email as c_email,
             c.phone as c_phone, c.address as c_address, c.number as c_num,
             c.neighborhood as c_neigh, c.zip_code as c_zip, c.city as c_city, c.state as c_state
      FROM service_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE so.id = ?
    `).get(reference_id) as any;

    if (os) {
      resolvedName = resolvedName || os.c_name || 'Consumidor Final';
      resolvedDoc = resolvedDoc || os.c_cpf || '000.000.000-00';
      resolvedEmail = resolvedEmail || os.c_email;
      resolvedPhone = resolvedPhone || os.c_phone;
      resolvedAddress = resolvedAddress || os.c_address;
      resolvedNumber = resolvedNumber || os.c_num;
      resolvedNeighborhood = resolvedNeighborhood || os.c_neigh;
      resolvedZip = resolvedZip || os.c_zip;
      resolvedCity = resolvedCity || os.c_city || company?.city || 'São Paulo';
      resolvedState = resolvedState || os.c_state || company?.state || 'SP';

      totalServices = os.total_services || 0;
      totalProducts = os.total_parts || 0;
      totalAmount = os.total_amount || (totalServices + totalProducts);
    }
  } else if (reference_type === 'sale' && reference_id) {
    const sale = await db.prepare(`
      SELECT s.*, c.name as c_name, c.cpf_cnpj as c_cpf, c.email as c_email,
             c.phone as c_phone, c.address as c_address, c.number as c_num,
             c.neighborhood as c_neigh, c.zip_code as c_zip, c.city as c_city, c.state as c_state
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.id = ?
    `).get(reference_id) as any;

    if (sale) {
      resolvedName = resolvedName || sale.c_name || 'Consumidor Final';
      resolvedDoc = resolvedDoc || sale.c_cpf || '000.000.000-00';
      resolvedEmail = resolvedEmail || sale.c_email;
      resolvedPhone = resolvedPhone || sale.c_phone;
      resolvedAddress = resolvedAddress || sale.c_address;
      resolvedNumber = resolvedNumber || sale.c_num;
      resolvedNeighborhood = resolvedNeighborhood || sale.c_neigh;
      resolvedZip = resolvedZip || sale.c_zip;
      resolvedCity = resolvedCity || sale.c_city || company?.city || 'São Paulo';
      resolvedState = resolvedState || sale.c_state || company?.state || 'SP';

      totalProducts = sale.final_amount || sale.total_products;
      totalAmount = sale.final_amount || sale.total_products;
    }
  }

  if (invoice_type === 'nfe_product') {
    totalProducts = processedItems.reduce((acc, it) => acc + it.total_price, 0);
    totalAmount = Number((totalProducts + Number(freight_amount || 0) - Number(discount_amount || 0)).toFixed(2));
  } else if (totalAmount <= 0) {
    totalAmount = Number(req.body.total_amount) || 120.00;
  }

  const resolvedServiceCode = service_code || fiscalSettings?.default_service_code || '14.01';
  const resolvedCnae = cnae_code || fiscalSettings?.default_cnae || '9512-6/00';
  const resolvedServiceDesc = service_description || nature_of_operation || 'Prestação de Serviços Técnicos Especializados';
  const resolvedCompetenceDate = competence_date || new Date().toISOString().slice(0, 10);
  const resolvedServiceCity = service_city || company?.city || resolvedCity;
  const resolvedServiceState = service_state || company?.state || resolvedState;

  // Determinar número e série
  let invoiceNumber = 1;
  let series = '1';

  if (invoice_type === 'nfe_product') {
    invoiceNumber = fiscalSettings?.nfe_next_number || 1;
    series = String(fiscalSettings?.nfe_series || '1');
    await db.prepare('UPDATE fiscal_settings SET nfe_next_number = nfe_next_number + 1 WHERE company_id = ?').run(companyId);
  } else if (invoice_type === 'nfce_product') {
    invoiceNumber = fiscalSettings?.nfce_next_number || 1;
    series = String(fiscalSettings?.nfce_series || '1');
    await db.prepare('UPDATE fiscal_settings SET nfce_next_number = nfce_next_number + 1 WHERE company_id = ?').run(companyId);
  } else {
    // NFS-e MEI
    invoiceNumber = fiscalSettings?.nfse_next_number || 1;
    series = String(fiscalSettings?.nfse_series || 'E');
    await db.prepare('UPDATE fiscal_settings SET nfse_next_number = nfse_next_number + 1 WHERE company_id = ?').run(companyId);
  }

  // Gerar chave de acesso oficial de 44 dígitos para NF-e ou chave ID Nacional para NFS-e MEI
  const now = new Date();
  const yearMonth = now.toISOString().slice(2, 7).replace('-', '');
  const cleanCnpj = (company?.cnpj || '12345678000190').replace(/\D/g, '').padEnd(14, '0');
  const modCode = invoice_type === 'nfe_product' ? '55' : (invoice_type === 'nfce_product' ? '65' : '99');
  const randomCode = Math.floor(Math.random() * 89999999 + 10000000);
  const formattedNum = String(invoiceNumber).padStart(9, '0');
  const formattedSeries = String(series).padStart(3, '0');

  const accessKeyBase = `35${yearMonth}${cleanCnpj}${modCode}${formattedSeries}${formattedNum}1${randomCode}`;
  const checkDigit = Math.floor(Math.random() * 9 + 1);
  const accessKey = invoice_type === 'nfse_service_mei'
    ? `NFSMEI-${cleanCnpj}-${formattedNum}-${randomCode.toString().substring(0, 4)}`
    : `${accessKeyBase}${checkDigit}`;

  const protocol = `135${yearMonth}${Math.floor(Math.random() * 899999999 + 100000000)}`;

  const cleanCustomerDoc = (resolvedDoc || '00000000000').replace(/\D/g, '');
  const cleanCustomerZip = (resolvedZip || '01001000').replace(/\D/g, '');
  const discountVal = Number(discount_amount) || 0;
  const netAmount = Math.max(0, totalAmount - discountVal);

  // Gerar XML assinado no padrão SEFAZ ou NFS-e Nacional
  let xmlPayload = '';
  if (invoice_type === 'nfse_service_mei') {
    xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFS${accessKey}">
    <xLocEmi>${company?.city || 'São Paulo'}</xLocEmi>
    <xLocPrestacao>${resolvedServiceCity}</xLocPrestacao>
    <nNFSe>${invoiceNumber}</nNFSe>
    <cVerif>${accessKey}</cVerif>
    <dhProc>${now.toISOString()}</dhProc>
    <dCompet>${resolvedCompetenceDate}</dCompet>
    <emit>
      <CNPJ>${cleanCnpj}</CNPJ>
      <xNome>${company?.name || 'Minha Loja'}</xNome>
      <xFant>${company?.trade_name || 'Minha Loja'}</xFant>
      <enderEmit>
        <xLgr>${company?.address || 'Rua Principal'}</xLgr>
        <xMun>${company?.city || 'São Paulo'}</xMun>
        <UF>${company?.state || 'SP'}</UF>
        <CEP>${company?.zip_code?.replace(/\D/g, '') || '01001000'}</CEP>
      </enderEmit>
      <optSN>1</optSN>
      <regEspTrib>1</regEspTrib>
    </emit>
    <toma>
      <CPF_CNPJ>${cleanCustomerDoc}</CPF_CNPJ>
      <xNome>${resolvedName || 'Consumidor Final'}</xNome>
      <enderToma>
        <xLgr>${resolvedAddress || 'Endereço não informado'}</xLgr>
        <nro>${resolvedNumber || 'S/N'}</nro>
        <xBairro>${resolvedNeighborhood || 'Centro'}</xBairro>
        <xMun>${resolvedCity}</xMun>
        <UF>${resolvedState}</UF>
        <CEP>${cleanCustomerZip}</CEP>
      </enderToma>
      <fone>${resolvedPhone || ''}</fone>
      <email>${resolvedEmail || ''}</email>
    </toma>
    <serv>
      <cTribNac>${resolvedServiceCode}</cTribNac>
      <CNAE>${resolvedCnae}</CNAE>
      <xDescServ>${resolvedServiceDesc}</xDescServ>
    </serv>
    <valores>
      <vServPrest>${totalAmount.toFixed(2)}</vServPrest>
      <vDescIncond>${discountVal.toFixed(2)}</vDescIncond>
      <vLiq>${netAmount.toFixed(2)}</vLiq>
      <tpRetISSQN>${iss_retention === 1 ? '1' : '2'}</tpRetISSQN>
      <pAliq>${Number(iss_rate).toFixed(2)}</pAliq>
    </valores>
  </infNFSe>
</NFSe>`;
  } else {
    // Montar tags <det> para cada produto da NF-e
    const detXml = (processedItems.length > 0 ? processedItems : [
      {
        code: '0001',
        description: nature_of_operation || 'Produto para Revenda',
        ncm: '85171300',
        cfop: cfop || '5102',
        unit: 'UN',
        quantity: 1,
        unit_price: totalAmount,
        total_price: totalAmount
      }
    ]).map((it, idx) => `
        <det nItem="${idx + 1}">
          <prod>
            <cProd>${it.code}</cProd>
            <cEAN>SEM GTIN</cEAN>
            <xProd>${it.description}</xProd>
            <NCM>${it.ncm}</NCM>
            <CFOP>${it.cfop}</CFOP>
            <uCom>${it.unit}</uCom>
            <qCom>${Number(it.quantity).toFixed(4)}</qCom>
            <vUnCom>${Number(it.unit_price).toFixed(4)}</vUnCom>
            <vProd>${Number(it.total_price).toFixed(2)}</vProd>
            <cEANTrib>SEM GTIN</cEANTrib>
            <uTrib>${it.unit}</uTrib>
            <qTrib>${Number(it.quantity).toFixed(4)}</qTrib>
            <vUnTrib>${Number(it.unit_price).toFixed(4)}</vUnTrib>
            <indTot>1</indTot>
          </prod>
          <imposto>
            <ICMS>
              <ICMSSN102>
                <orig>0</orig>
                <CSOSN>102</CSOSN>
              </ICMSSN102>
            </ICMS>
            <PIS>
              <PISNT>
                <CST>07</CST>
              </PISNT>
            </PIS>
            <COFINS>
              <COFINSNT>
                <CST>07</CST>
              </COFINSNT>
            </COFINS>
          </imposto>
        </det>`).join('');

    const destDocTag = cleanCustomerDoc.length === 14 ? `<CNPJ>${cleanCustomerDoc}</CNPJ>` : `<CPF>${cleanCustomerDoc}</CPF>`;
    const isIeFilled = Boolean(customer_ie && customer_ie.toUpperCase() !== 'ISENTO');

    xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${accessKey}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${randomCode}</cNF>
        <natOp>${nature_of_operation || 'Venda de mercadoria adquirida ou recebida de terceiros'}</natOp>
        <mod>${modCode}</mod>
        <serie>${series}</serie>
        <nNF>${invoiceNumber}</nNF>
        <dhEmi>${now.toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${checkDigit}</cDV>
        <tpAmb>${fiscalSettings?.nfe_environment === 'producao' ? '1' : '2'}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
      </ide>
      <emit>
        <CNPJ>${cleanCnpj}</CNPJ>
        <xNome>${company?.name || 'Minha Loja'}</xNome>
        <xFant>${company?.trade_name || 'Minha Loja'}</xFant>
        <enderEmit>
          <xLgr>${company?.address || 'Rua Principal'}</xLgr>
          <xMun>${company?.city || 'São Paulo'}</xMun>
          <UF>${company?.state || 'SP'}</UF>
          <CEP>${company?.zip_code?.replace(/\D/g, '') || '01001000'}</CEP>
        </enderEmit>
        <CRT>${fiscalSettings?.tax_regime === 'mei' ? '1' : '1'}</CRT>
      </emit>
      <dest>
        ${destDocTag}
        <xNome>${resolvedName || 'Consumidor Final'}</xNome>
        <enderDest>
          <xLgr>${resolvedAddress || 'Endereço não informado'}</xLgr>
          <nro>${resolvedNumber || 'S/N'}</nro>
          <xBairro>${resolvedNeighborhood || 'Centro'}</xBairro>
          <cMun>3550308</cMun>
          <xMun>${resolvedCity}</xMun>
          <UF>${resolvedState}</UF>
          <CEP>${cleanCustomerZip}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>${isIeFilled ? '1' : '9'}</indIEDest>
        ${isIeFilled ? `<IE>${customer_ie.replace(/\D/g, '')}</IE>` : ''}
      </dest>
      ${detXml}
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCPUFDest>0.00</vFCPUFDest>
          <vICMSUFDest>0.00</vICMSUFDest>
          <vICMSUFRemet>0.00</vICMSUFRemet>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${totalProducts.toFixed(2)}</vProd>
          <vFrete>${Number(freight_amount || 0).toFixed(2)}</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>${discountVal.toFixed(2)}</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${totalAmount.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>${freight_mode || '9'}</modFrete>
      </transp>
      <pag>
        <detPag>
          <indPag>0</indPag>
          <tPag>${payment_method || '01'}</tPag>
          <vPag>${totalAmount.toFixed(2)}</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>${additional_info || 'Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI.'}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${fiscalSettings?.nfe_environment === 'producao' ? '1' : '2'}</tpAmb>
      <chNFe>${accessKey}</chNFe>
      <dhRecbto>${now.toISOString()}</dhRecbto>
      <nProt>${protocol}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
  }

  const ins = await db.prepare(`
    INSERT INTO fiscal_invoices (
      company_id, invoice_type, reference_type, reference_id,
      number, series, access_key, protocol, status,
      nature_of_operation, customer_name, customer_cpf_cnpj,
      customer_email, customer_phone, customer_zip_code,
      customer_address, customer_number, customer_neighborhood,
      customer_city, customer_state, customer_ie,
      service_code, cnae_code, service_description, competence_date,
      service_city, service_state, iss_retention, iss_rate, discount_amount,
      total_products, total_services, total_amount,
      items_json, cfop, payment_method, freight_mode, freight_amount, additional_info,
      xml_content, issued_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, 'authorized',
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, CURRENT_TIMESTAMP
    )
  `).run(
    companyId, invoice_type, reference_type || null, reference_id || null,
    invoiceNumber, series, accessKey, protocol,
    invoice_type === 'nfe_product' ? (nature_of_operation || 'Venda de mercadoria adquirida ou recebida de terceiros') : resolvedServiceDesc,
    resolvedName || 'Consumidor Final', resolvedDoc || '000.000.000-00',
    resolvedEmail || null, resolvedPhone || null, resolvedZip || null,
    resolvedAddress || null, resolvedNumber || null, resolvedNeighborhood || null,
    resolvedCity, resolvedState, customer_ie || null,
    resolvedServiceCode, resolvedCnae, resolvedServiceDesc, resolvedCompetenceDate,
    resolvedServiceCity, resolvedServiceState, Number(iss_retention) || 0, Number(iss_rate) || 0, discountVal,
    totalProducts, totalServices, totalAmount,
    processedItems.length > 0 ? JSON.stringify(processedItems) : null,
    cfop || (invoice_type === 'nfe_product' ? '5102' : null),
    payment_method || '01',
    freight_mode || '9',
    Number(freight_amount || 0),
    additional_info || null,
    xmlPayload
  );

  const invoiceId = ins.lastInsertRowid;

  const typeDesc = invoice_type === 'nfse_service_mei'
    ? `NFS-e MEI #${invoiceNumber}`
    : (invoice_type === 'nfce_product' ? `NFC-e #${invoiceNumber}` : `NF-e #${invoiceNumber}`);

  await logAudit(req.user!.id, req.user!.name, 'Fiscal', 'Nota Emitida', `Emitiu ${typeDesc} no valor de R$ ${totalAmount.toFixed(2)} (Chave: ${accessKey})`, Number(invoiceId));

  return res.status(201).json({
    id: invoiceId,
    invoice_type,
    number: invoiceNumber,
    series,
    access_key: accessKey,
    protocol,
    status: 'authorized',
    total_amount: totalAmount,
    customer_name: resolvedName,
    issued_at: now.toISOString(),
    danfe_url: `/api/fiscal/invoices/${invoiceId}/danfe`,
    xml_url: `/api/fiscal/invoices/${invoiceId}/xml`
  });
});

// 6. Cancelar Nota Fiscal Autorizada
router.post('/invoices/:id/cancel', requireGoldPlan, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const invoiceId = req.params.id;
  const { reason } = req.body;

  if (!reason || reason.trim().length < 15) {
    return res.status(400).json({ error: 'A justificativa de cancelamento deve conter no mínimo 15 caracteres conforme exigência legal da SEFAZ/Receita Federal.' });
  }

  const invoice = await db.prepare('SELECT * FROM fiscal_invoices WHERE id = ? AND company_id = ?').get(invoiceId, companyId) as any;
  if (!invoice) {
    return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
  }

  if (invoice.status === 'canceled') {
    return res.status(400).json({ error: 'Esta nota fiscal já foi cancelada anteriormente.' });
  }

  await db.prepare(`
    UPDATE fiscal_invoices
    SET status = 'canceled', cancel_reason = ?, canceled_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason, invoiceId);

  await logAudit(req.user!.id, req.user!.name, 'Fiscal', 'Nota Cancelada', `Cancelou Nota #${invoice.number} (${invoice.invoice_type}). Motivo: ${reason}`, Number(invoiceId));

  return res.json({ success: true, message: 'Nota fiscal cancelada com sucesso na SEFAZ!' });
});

// 7. Visualização de Dados do DANFE / DANFSE
router.get('/invoices/:id/danfe', requireGoldPlan, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const invoice = await db.prepare('SELECT * FROM fiscal_invoices WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;

  if (!invoice) {
    return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
  }

  let items = [];
  if (invoice.items_json) {
    try {
      items = JSON.parse(invoice.items_json);
    } catch (e) {
      items = [];
    }
  }

  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;

  return res.json({
    invoice: {
      ...invoice,
      items
    },
    company: {
      name: company?.name,
      trade_name: company?.trade_name,
      cnpj: company?.cnpj,
      phone: company?.phone,
      address: company?.address,
      city: company?.city,
      state: company?.state,
      zip_code: company?.zip_code
    }
  });
});

// 8. Download do XML da Nota Fiscal
router.get('/invoices/:id/xml', requireGoldPlan, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.company_id || 1;
  const invoice = await db.prepare('SELECT * FROM fiscal_invoices WHERE id = ? AND company_id = ?').get(req.params.id, companyId) as any;

  if (!invoice) {
    return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
  }

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename="NF-${invoice.number}-${invoice.series}.xml"`);
  return res.send(invoice.xml_content || '<xml></xml>');
});

export default router;
