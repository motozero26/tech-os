import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';
import { db, initDatabase } from './db.js';

console.log('====================================================');
console.log('📑 TESTES DO MÓDULO FISCAL & EXCLUSIVIDADE PLANO OURO');
console.log('   Assistencia shop — NF-e Produtos (A1) & NFS-e MEI');
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
  const token = jwt.sign({ id: admin.id, name: admin.name, role: admin.role, company_id: admin.company_id || 1 }, JWT_SECRET);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Verificar catálogo de planos: apenas 2 planos mensais (Prata e Ouro)
    const resPlans = await fetch(`${BASE_URL}/subscription/plans`, { headers });
    const plans = await resPlans.json();
    assert(Array.isArray(plans) && plans.length === 2, '1. Apenas 2 planos mensais ativos na plataforma (Prata e Ouro)');
    const planNames = plans.map((p: any) => p.name);
    assert(planNames.includes('Prata') && planNames.includes('Ouro'), '2. Planos cadastrados são exatamente Prata e Ouro');

    // 2. Bloqueio no Plano Prata (Emissão Fiscal Exclusiva do Plano Ouro)
    const prataPlan = plans.find((p: any) => p.name === 'Prata');
    const ouroPlan = plans.find((p: any) => p.name === 'Ouro');

    await fetch(`${BASE_URL}/saas/tenants/1`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        plan_id: prataPlan.id,
        subscription_status: 'active'
      })
    });

    const resStatusPrata = await fetch(`${BASE_URL}/fiscal/status`, { headers });
    const statusPrata = await resStatusPrata.json();
    assert(statusPrata.has_fiscal_access === false && statusPrata.requires_upgrade === true, '3. Loja no Plano Prata tem has_fiscal_access = false');

    const resBlockEmit = await fetch(`${BASE_URL}/fiscal/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice_type: 'nfse_service_mei',
        total_amount: 150.00
      })
    });
    assert(resBlockEmit.status === 403, '4. Tentativa de emissão fiscal no Plano Prata bloqueada com HTTP 403');
    const blockBody = await resBlockEmit.json();
    assert(blockBody.requires_upgrade === true && blockBody.required_plan === 'Ouro', '5. Mensagem orientando upgrade para o Plano Ouro retornada');

    // 3. Upgrade para Plano Ouro e Liberação do Módulo Fiscal
    await fetch(`${BASE_URL}/saas/tenants/1`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        plan_id: ouroPlan.id,
        subscription_status: 'active'
      })
    });

    const resStatusOuro = await fetch(`${BASE_URL}/fiscal/status`, { headers });
    const statusOuro = await resStatusOuro.json();
    assert(statusOuro.has_fiscal_access === true && statusOuro.requires_upgrade === false, '6. Loja no Plano Ouro tem acesso liberado ao módulo fiscal');

    // 4. Configurações Fiscais: NFS-e de Serviços para MEI (Dispensa Certificado Digital)
    const resSaveMei = await fetch(`${BASE_URL}/fiscal/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        tax_regime: 'mei',
        nfe_environment: 'homologacao',
        is_mei: true,
        nfse_mei_user: '12.345.678/0001-90',
        nfse_mei_password: 'senha_portal_nacional',
        default_service_code: '14.01',
        default_cnae: '9511-8/00',
        nfse_series: 'E',
        nfse_next_number: 101
      })
    });
    const saveMeiRes = await resSaveMei.json();
    assert(resSaveMei.status === 200 && saveMeiRes.success, '7. Configuração NFS-e MEI salva com sucesso sem obrigatoriedade de certificado digital');

    // 5. Emissão de NFS-e de Serviço MEI (Padrão Nacional com Campos Obrigatórios do Governo)
    // 5.1 Busca de clientes já cadastrados para agilizar preenchimento
    const resSearchCust = await fetch(`${BASE_URL}/customers?q=Carlos`, { headers });
    const foundCustomers = await resSearchCust.json();
    assert(Array.isArray(foundCustomers), '8. Busca de clientes já cadastrados operacional');

    // 5.2 Validação de campos obrigatórios do padrão nacional da NFS-e
    const resEmitInvalid = await fetch(`${BASE_URL}/fiscal/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice_type: 'nfse_service_mei',
        customer_name: '', // Inválido
        customer_cpf_cnpj: '',
        total_amount: 150.00
      })
    });
    assert(resEmitInvalid.status === 400, '9. Rejeição de emissão quando faltam campos obrigatórios do Tomador (Nome/Doc)');

    // 5.3 Emissão com campos obrigatórios completos do padrão do governo
    const resEmitNfse = await fetch(`${BASE_URL}/fiscal/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice_type: 'nfse_service_mei',
        customer_name: 'Carlos Oliveira Pereira',
        customer_cpf_cnpj: '333.444.555-66',
        customer_email: 'carlos.pereira@email.com',
        customer_phone: '(11) 98888-7777',
        customer_zip_code: '01310-100',
        customer_address: 'Avenida Paulista',
        customer_number: '1578',
        customer_neighborhood: 'Bela Vista',
        customer_city: 'São Paulo',
        customer_state: 'SP',
        service_code: '14.01',
        cnae_code: '9512-6/00',
        service_description: 'Substituição de display OLED original e reparo do conector de carga em iPhone 12',
        nature_of_operation: 'Manutenção técnica em smartphone',
        competence_date: '2026-11-15',
        service_city: 'São Paulo',
        service_state: 'SP',
        iss_retention: 0,
        iss_rate: 0,
        discount_amount: 10.00,
        total_amount: 190.00
      })
    });
    const nfseData = await resEmitNfse.json();
    assert(resEmitNfse.status === 201 && nfseData.status === 'authorized', '10. Emissão de NFS-e de Serviço (Padrão Nacional do Governo) autorizada');
    assert(nfseData.access_key && nfseData.access_key.startsWith('NFSMEI-'), '11. Identificador nacional de autenticidade NFS-e MEI gerado');

    // 5.4 Consulta DANFSE com validação dos dados completos do Tomador e Serviço
    const resDanfseView = await fetch(`${BASE_URL}/fiscal/invoices/${nfseData.id}/danfe`, { headers });
    const danfseView = await resDanfseView.json();
    assert(danfseView.invoice?.service_code === '14.01', '12. Código do serviço da LC 116 (14.01) gravado e recuperado no DANFSE');
    assert(danfseView.invoice?.customer_address === 'Avenida Paulista', '13. Endereço completo do Tomador gravado no documento fiscal');

    // 6. Tentativa de emitir NF-e de Produtos SEM Certificado Digital A1
    await fetch(`${BASE_URL}/fiscal/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        tax_regime: 'mei',
        certificate_a1_filename: '',
        certificate_a1_base64: ''
      })
    });
    const resFailNfe = await fetch(`${BASE_URL}/fiscal/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice_type: 'nfe_product',
        customer_name: 'Cliente Balcão',
        customer_cpf_cnpj: '111.222.333-44',
        total_amount: 85.00
      })
    });
    const failNfeData = await resFailNfe.json();
    assert(resFailNfe.status === 400 && failNfeData.code === 'MISSING_CERTIFICATE', '14. Emissão de NF-e de produtos sem certificado A1 rejeitada com aviso de obrigatoriedade');

    // 7. Instalação de Certificado Digital A1 (.pfx) para Produtos
    const mockCertBase64 = 'MIIKgwIBAzCCCm8GCSqGSIb3DQEHAaCCCmAEggpcMIIKWDCCBO8GCSqGSIb3DQEHBqCCBOAwggTcAgEAMIIE1QYJKoZIhvcNAQcBMBwGCiqGSIb3DQEMAQMwDgQIKL0xV6aN...';
    const resSaveCert = await fetch(`${BASE_URL}/fiscal/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        tax_regime: 'mei',
        certificate_a1_filename: 'certificado_assistencia_2026.pfx',
        certificate_a1_base64: mockCertBase64,
        certificate_password: 'senha_segura_a1',
        nfe_series: 1,
        nfe_next_number: 201
      })
    });
    assert(resSaveCert.status === 200, '15. Upload e vinculação de Certificado Digital A1 (.pfx) concluídos');

    // 8. Emissão de NF-e de Produtos COM Certificado Digital A1
    // 8.1 Validação: NF-e exige inclusão de produtos
    const resEmitNfeNoItems = await fetch(`${BASE_URL}/fiscal/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice_type: 'nfe_product',
        customer_name: 'Marcos Vinicius Santos',
        customer_cpf_cnpj: '222.333.444-55',
        customer_address: 'Rua das Flores',
        customer_city: 'São Paulo',
        customer_state: 'SP',
        items: [] // Sem produtos
      })
    });
    assert(resEmitNfeNoItems.status === 400, '16. Tentativa de emitir NF-e de produtos sem itens rejeitada com status 400');

    // 8.2 Buscar produto já cadastrado no estoque para puxar dados fiscais
    const resProdStock = await fetch(`${BASE_URL}/products?q=Tela`, { headers });
    const stockProds = await resProdStock.json();
    assert(Array.isArray(stockProds) && stockProds.length > 0, '17. Busca de produtos no estoque operacional para autopreenchimento de NF-e');
    const selectedProd = stockProds[0];

    // 8.3 Emissão de NF-e de Produtos Completa com Itens, NCM, CFOP, Frete e Pagamento
    const resEmitNfe = await fetch(`${BASE_URL}/fiscal/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice_type: 'nfe_product',
        customer_name: 'Marcos Vinicius Santos',
        customer_cpf_cnpj: '222.333.444-55',
        customer_ie: 'ISENTO',
        customer_email: 'marcos.santos@email.com',
        customer_phone: '(11) 97777-6666',
        customer_zip_code: '04571-010',
        customer_address: 'Avenida Engenheiro Luís Carlos Berrini',
        customer_number: '1000',
        customer_neighborhood: 'Brooklin',
        customer_city: 'São Paulo',
        customer_state: 'SP',
        nature_of_operation: 'Venda de mercadoria adquirida ou recebida de terceiros',
        cfop: '5102',
        freight_mode: '9',
        freight_amount: 15.00,
        payment_method: '17', // PIX
        additional_info: 'Documento emitido por ME optante pelo Simples Nacional.',
        discount_amount: 5.00,
        items: [
          {
            code: selectedProd.sku || selectedProd.barcode || 'PROD-001',
            description: selectedProd.name,
            ncm: selectedProd.ncm || '8517.13.00',
            cfop: '5102',
            unit: selectedProd.unit || 'UN',
            quantity: 2,
            unit_price: Number(selectedProd.sale_price) || 250.00
          }
        ]
      })
    });
    const nfeData = await resEmitNfe.json();
    assert(resEmitNfe.status === 201 && nfeData.status === 'authorized', '18. Emissão de NF-e de Produto com produtos puxados do estoque autorizada pela SEFAZ');
    assert(nfeData.access_key && nfeData.access_key.length === 44, '19. Chave de acesso oficial SEFAZ de 44 dígitos gerada');
    assert(!!nfeData.protocol, '20. Protocolo de autorização de uso emitido');

    // 9. Visualização do DANFE com Itens Parseados
    const resDanfe = await fetch(`${BASE_URL}/fiscal/invoices/${nfeData.id}/danfe`, { headers });
    const danfe = await resDanfe.json();
    assert(resDanfe.status === 200 && danfe.invoice?.id === nfeData.id, '21. Espelho de DANFE gerado com dados da empresa e destinatário');
    assert(Array.isArray(danfe.invoice?.items) && danfe.invoice.items.length === 1, '22. Itens dos produtos recuperados e parseados com sucesso no DANFE');
    assert(danfe.invoice.items[0].description === selectedProd.name, '23. Descrição do produto do estoque conferida no DANFE');

    // 10. Download do XML da Nota com Tags SEFAZ <det>, <prod>, <NCM>, <CFOP>
    const resXml = await fetch(`${BASE_URL}/fiscal/invoices/${nfeData.id}/xml`, { headers });
    const xmlText = await resXml.text();
    assert(resXml.status === 200 && xmlText.includes('nfeProc') && xmlText.includes(nfeData.access_key), '24. XML assinado no padrão SEFAZ/Receita Federal disponível para download');
    assert(xmlText.includes('<det nItem="1">') && xmlText.includes('<cProd>') && xmlText.includes('<xProd>'), '25. XML da NF-e contém estrutura oficial <det> e <prod> para os itens');
    assert(xmlText.includes('<ICMSSN102>') && xmlText.includes('<vProd>') && xmlText.includes('<modFrete>9</modFrete>'), '26. XML da NF-e contém totais, impostos Simples Nacional e modalidade de frete');

    // 11. Cancelamento de Nota Fiscal
    const resCancelFail = await fetch(`${BASE_URL}/fiscal/invoices/${nfeData.id}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Curto' })
    });
    assert(resCancelFail.status === 400, '27. Cancelamento rejeita justificativa com menos de 15 caracteres (exigência SEFAZ)');

    const resCancelOk = await fetch(`${BASE_URL}/fiscal/invoices/${nfeData.id}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Cancelamento motivado por desistência da compra pelo cliente e estorno no caixa' })
    });
    const cancelRes = await resCancelOk.json();
    assert(resCancelOk.status === 200 && cancelRes.success, '28. Cancelamento de nota fiscal homologado com sucesso');

    const resCheckCanceled = await fetch(`${BASE_URL}/fiscal/invoices?status=canceled`, { headers });
    const canceledList = await resCheckCanceled.json();
    assert(canceledList.some((i: any) => i.id === nfeData.id), '29. Status da nota atualizado para canceled no banco');

  } catch (err: any) {
    console.error('Erro na execução dos testes fiscais:', err);
    assert(false, `Falha: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DOS TESTES FISCAIS: ${testsPassed} PASS / ${testsFailed} FAIL`);
  console.log('====================================================');
  if (testsFailed > 0) {
    process.exit(1);
  }
}

run();
