import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth.js';
import { db, initDatabase } from './db.js';

console.log('====================================================');
console.log('🎨 TESTES DE PERSONALIZAÇÃO VISUAL & FOTOS DE ENTRADA O.S.');
console.log('   Assistencia shop — Anexo de Imagens & Customização Loja');
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
    // 1. Get initial company settings
    const compRes = await fetch(`${BASE_URL}/settings/company`, { headers });
    assert(compRes.ok, '1. Consulta inicial das configurações da empresa');
    const compData = await compRes.json();
    assert(compData.id === 1, '2. Matriz ID 1 identificada');

    // 2. Update company customization (logo & theme colors & theme mode)
    const testLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const testPrimaryColor = '#059669'; // Emerald
    const testSecondaryColor = '#064e3b';
    const testThemeMode = 'light';

    const updateCompRes = await fetch(`${BASE_URL}/settings/company`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...compData,
        trade_name: 'Minha Loja Tech',
        logo: testLogo,
        primary_color: testPrimaryColor,
        secondary_color: testSecondaryColor,
        theme_mode: testThemeMode
      })
    });
    assert(updateCompRes.ok, '3. Salvar personalização da empresa (logo, cores e modo claro/escuro)');

    // 3. Verify company settings persistence
    const verifyCompRes = await fetch(`${BASE_URL}/settings/company`, { headers });
    const verifyComp = await verifyCompRes.json();
    assert(verifyComp.logo === testLogo, '4. Logo personalizada persistida com sucesso');
    assert(verifyComp.primary_color === testPrimaryColor, '5. Cor primária (#059669) persistida no banco');
    assert(verifyComp.secondary_color === testSecondaryColor, '6. Cor secundária (#064e3b) persistida no banco');
    assert(verifyComp.trade_name === 'Minha Loja Tech', '7. Nome fantasia atualizado');
    assert(verifyComp.theme_mode === 'light', '8. Modo de exibição claro ("light") persistido no banco de dados');

    // 3.1 Test toggling back to dark mode
    const updateDarkModeRes = await fetch(`${BASE_URL}/settings/company`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...verifyComp,
        theme_mode: 'dark'
      })
    });
    assert(updateDarkModeRes.ok, '9. Alternância para modo escuro ("dark") via API');
    const verifyDarkCompRes = await fetch(`${BASE_URL}/settings/company`, { headers });
    const verifyDarkComp = await verifyDarkCompRes.json();
    assert(verifyDarkComp.theme_mode === 'dark', '10. Modo de exibição escuro ("dark") persistido com sucesso');

    // 4. Create an OS with entry photos
    const photo1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/sample_photo_tela_quebrada';
    const photo2 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/sample_photo_carcaca_amassada';

    const createOsRes = await fetch(`${BASE_URL}/os/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer_name: 'Cliente Fotos Teste',
        customer_phone: '(11) 98888-7777',
        customer_cpf: '123.456.789-00',
        device_brand: 'Apple',
        device_model: 'iPhone 12 Pro',
        device_color: 'Azul Pacífico',
        reported_defects: 'Vidro traseiro trincado e tela sem touch',
        entry_notes: 'Aparelho deu entrada com película protetora removida e marcas nas laterais',
        entry_photos: [photo1, photo2],
        warranty_period: 90,
        warranty_unit: 'Dias'
      })
    });
    assert(createOsRes.ok, '11. Abertura de O.S. com fotos do estado de entrada do equipamento');
    const osCreated = await createOsRes.json();
    assert(osCreated.id > 0, `12. O.S. #${osCreated.code} criada com ID ${osCreated.id}`);

    // 5. Query OS Details and check entry_photos
    const getOsRes = await fetch(`${BASE_URL}/os/${osCreated.id}`, { headers });
    assert(getOsRes.ok, '13. Consulta de detalhes da O.S. criada');
    const osDetail = await getOsRes.json();
    assert(Array.isArray(osDetail.os.entry_photos), '14. Campo entry_photos retornado como Array');
    assert(osDetail.os.entry_photos.length === 2, '15. Exatamente 2 fotos de entrada recuperadas');
    assert(osDetail.os.entry_photos[0] === photo1, '16. Primeira foto de entrada confere');
    assert(osDetail.os.entry_photos[1] === photo2, '17. Segunda foto de entrada confere');

    // 6. Update/Add more photos via POST /api/os/:id/photos
    const photo3 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/sample_photo_conector_carga';
    const updatePhotosRes = await fetch(`${BASE_URL}/os/${osCreated.id}/photos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        photos: [photo1, photo2, photo3]
      })
    });
    assert(updatePhotosRes.ok, '18. Adição de foto complementar na O.S. existente');

    // 7. Re-query OS Details and check updated photos
    const reGetOsRes = await fetch(`${BASE_URL}/os/${osCreated.id}`, { headers });
    const reOsDetail = await reGetOsRes.json();
    assert(reOsDetail.os.entry_photos.length === 3, '19. Fotos atualizadas totalizam 3 imagens');
    assert(reOsDetail.os.entry_photos[2] === photo3, '20. Nova foto complementar persistida com sucesso');

    // 8. Verify audit log registered photo update and settings update
    const auditRes = await fetch(`${BASE_URL}/settings/audit?limit=5`, { headers });
    const auditData = await auditRes.json();
    const hasPhotoAudit = auditData.data.some((log: any) => log.action === 'Atualização' && log.description.includes('fotos de entrada'));
    assert(hasPhotoAudit, '21. Log de auditoria registrado para atualização de fotos');

    const hasCompanyAudit = auditData.data.some((log: any) => log.module === 'Configurações' && log.description.includes('personalização visual'));
    assert(hasCompanyAudit, '22. Log de auditoria registrado para personalização visual');

    // 9. Reset trade_name back for other tests
    await fetch(`${BASE_URL}/settings/company`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...verifyComp,
        trade_name: 'Minha Loja'
      })
    });

  } catch (err: any) {
    console.error('Erro na execução dos testes:', err);
    assert(false, `Exceção capturada: ${err.message}`);
  }

  console.log(`\n====================================================`);
  console.log(`TOTAL PASS: ${testsPassed} | TOTAL FAIL: ${testsFailed}`);
  console.log(`====================================================`);
}

run();
